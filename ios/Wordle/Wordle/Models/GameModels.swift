import Foundation

enum GameStatus: String, Codable {
    case inProgress
    case won
    case lost
}

enum LetterState: Int, Codable {
    case unused = 0
    case absent = 1
    case present = 2
    case correct = 3
}

struct Guess: Codable, Hashable {
    let word: String
    let results: [LetterState]
}

struct GameHistoryEntry: Codable, Identifiable, Hashable {
    var id: Int64 { timestamp }
    let timestamp: Int64
    let answer: String
    let won: Bool
    let guesses: [String]

    var dateString: String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000)
        return Self.dateFormatter.string(from: date)
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

struct GameUiState {
    var isLoading = true
    var message: String?
    var guesses: [Guess] = []
    var currentInput = ""
    var status: GameStatus = .inProgress
    var maxGuesses = 6
}

enum AppRoute {
    case home
    case game
    case history
    case stats
    case about
    case howToPlay
}
