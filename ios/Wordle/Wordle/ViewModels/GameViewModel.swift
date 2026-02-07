import Foundation
import SwiftUI

@MainActor
final class GameViewModel: ObservableObject {
    @Published var state = GameUiState()
    @Published var history: [GameHistoryEntry] = []

    private let maxGuesses = 6
    private let wordLength = 5
    private let blockedAnswers: Set<String> = [
        "abuse","abort","adult","arson","bigot","blood","bosom","booze","boozy","bribe",
        "butch","crime","death","detox","drink","drunk","dummy","felon","fraud","gipsy",
        "heist","idiot","kinky","knife","loser","lynch","moron","rifle","smoke","smoky","thief",
        "toxic","toxin","venom","vomit"
    ]
    private let fallbackWords = ["apple", "baker", "cabin", "delta", "eagle", "fancy", "giant", "habit", "ideal", "joker", "lemon", "magic"]

    private let historyKey = "history_entries_json"
    private let answerIndexKey = "answer_index"
    private let randomSeedKey = "random_seed"

    private var wordList: [String] = []
    private var answerList: [String] = []
    private var wordSet: Set<String> = []
    private var answerSequence: [String] = []
    private var answer = ""
    private var answerIndex = 0
    private var randomSeed: UInt64 = 12345

    init() {
        loadPersistedState()
        loadWords()
    }

    func onKeyInput(_ letter: Character) {
        guard state.status == .inProgress else { return }
        guard state.currentInput.count < wordLength else { return }
        state.currentInput = String((state.currentInput + String(letter).lowercased()).prefix(wordLength))
    }

    func onDeleteInput() {
        guard state.status == .inProgress, !state.currentInput.isEmpty else { return }
        if state.message == "Not in the word list." {
            state.message = nil
        }
        state.currentInput.removeLast()
    }

    func submitGuess() {
        let guess = state.currentInput.lowercased()
        guard state.status == .inProgress else {
            state.message = "Start a new game."
            return
        }
        guard guess.count == wordLength else {
            state.message = "Enter a \(wordLength)-letter word."
            return
        }
        guard wordSet.contains(guess) else {
            state.message = "Not in the word list."
            return
        }

        let results = scoreGuess(answer: answer, guess: guess)
        let updatedGuesses = state.guesses + [Guess(word: guess, results: results)]

        let status: GameStatus
        if guess == answer {
            status = .won
        } else if updatedGuesses.count >= maxGuesses {
            status = .lost
        } else {
            status = .inProgress
        }

        let message: String
        switch status {
        case .won:
            message = "You solved it! The word was \(answer.uppercased())."
        case .lost:
            message = "Out of guesses. The word was \(answer.uppercased())."
        case .inProgress:
            message = ""
        }

        state.guesses = updatedGuesses
        state.status = status
        state.currentInput = ""
        state.message = message

        if status != .inProgress {
            let entry = GameHistoryEntry(
                timestamp: Int64(Date().timeIntervalSince1970 * 1000),
                answer: answer,
                won: status == .won,
                guesses: updatedGuesses.map { $0.word }
            )
            history.insert(entry, at: 0)
            persistHistory()
        }
    }

    func startNewGame(clearMessage: Bool = false) {
        let pool = answerSequence.isEmpty ? fallbackWords : answerSequence
        if !pool.isEmpty {
            answerIndex = answerIndex % pool.count
            answer = pool[answerIndex]
            answerIndex = (answerIndex + 1) % pool.count
            UserDefaults.standard.set(answerIndex, forKey: answerIndexKey)
        } else {
            answer = fallbackWords.randomElement() ?? "apple"
        }

        state.guesses = []
        state.status = .inProgress
        state.currentInput = ""
        state.message = clearMessage ? nil : "New game started."
    }

    func fullReset() {
        history = []
        UserDefaults.standard.removeObject(forKey: historyKey)
        randomSeed = UInt64(Date().timeIntervalSince1970)
        UserDefaults.standard.set(Int(randomSeed), forKey: randomSeedKey)
        answerIndex = 0
        UserDefaults.standard.set(answerIndex, forKey: answerIndexKey)
        answerSequence = shuffledAnswers()
        startNewGame(clearMessage: true)
        state.message = "Fully reset!"
    }

    func computeLetterStates() -> [Character: LetterState] {
        var result: [Character: LetterState] = [:]
        state.guesses.forEach { guess in
            for (idx, char) in guess.word.enumerated() {
                let current = result[char] ?? .unused
                let next = guess.results[safe: idx] ?? .unused
                if next.rawValue > current.rawValue {
                    result[char] = next
                }
            }
        }
        return result
    }

    private func scoreGuess(answer: String, guess: String) -> [LetterState] {
        var verdicts = Array(repeating: LetterState.absent, count: wordLength)
        var remaining: [Character: Int] = [:]

        answer.forEach { remaining[$0, default: 0] += 1 }

        for idx in 0..<wordLength {
            let ans = answer[answer.index(answer.startIndex, offsetBy: idx)]
            let g = guess[guess.index(guess.startIndex, offsetBy: idx)]
            if ans == g {
                verdicts[idx] = .correct
                remaining[g, default: 0] -= 1
            }
        }

        for idx in 0..<wordLength where verdicts[idx] != .correct {
            let g = guess[guess.index(guess.startIndex, offsetBy: idx)]
            if (remaining[g] ?? 0) > 0 {
                verdicts[idx] = .present
                remaining[g, default: 0] -= 1
            }
        }

        return verdicts
    }

    private func loadWords() {
        state.isLoading = true
        let guesses = readWords(named: "allowed-guesses")
        let answers = readWords(named: "allowed-answers")
        wordList = (guesses.isEmpty ? fallbackWords : guesses).filter { !blockedAnswers.contains($0) }
        answerList = (answers.isEmpty ? fallbackWords : answers).filter { !blockedAnswers.contains($0) }
        wordSet = Set(wordList + answerList)
        answerSequence = shuffledAnswers()
        if !answerSequence.isEmpty {
            answerIndex = answerIndex % answerSequence.count
        }
        startNewGame(clearMessage: true)
        state.isLoading = false
    }

    private func shuffledAnswers() -> [String] {
        var generator = SeededGenerator(seed: randomSeed)
        return (answerList.isEmpty ? fallbackWords : answerList).shuffled(using: &generator)
    }

    private func readWords(named file: String) -> [String] {
        guard let url = Bundle.main.url(forResource: file, withExtension: "txt"),
              let content = try? String(contentsOf: url) else { return [] }

        return content
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
            .filter { $0.count == wordLength && $0.allSatisfy(\.isLetter) }
    }

    private func loadPersistedState() {
        answerIndex = UserDefaults.standard.integer(forKey: answerIndexKey)
        let persistedSeed = UserDefaults.standard.integer(forKey: randomSeedKey)
        randomSeed = UInt64(persistedSeed == 0 ? 12345 : persistedSeed)

        if let raw = UserDefaults.standard.string(forKey: historyKey),
           let data = raw.data(using: .utf8),
           let decoded = try? JSONDecoder().decode([GameHistoryEntry].self, from: data) {
            history = decoded.sorted { $0.timestamp > $1.timestamp }
        }
    }

    private func persistHistory() {
        guard let data = try? JSONEncoder().encode(history),
              let raw = String(data: data, encoding: .utf8) else { return }
        UserDefaults.standard.set(raw, forKey: historyKey)
    }
}

private struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    init(seed: UInt64) {
        self.state = seed
    }

    mutating func next() -> UInt64 {
        state = 2862933555777941757 &* state &+ 3037000493
        return state
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
