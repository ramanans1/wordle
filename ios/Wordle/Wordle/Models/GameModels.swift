import Foundation

enum GameStatus: String, Codable {
    case inProgress
    case won
    case lost
}

enum GameMode: String, Codable, CaseIterable, Identifiable {
    case mini
    case junior
    case classic
    case epic

    var id: String { rawValue }

    var label: String {
        switch self {
        case .mini: return "Mini"
        case .junior: return "Junior"
        case .classic: return "Classic"
        case .epic: return "Epic"
        }
    }

    var wordLength: Int {
        switch self {
        case .mini: return 3
        case .junior: return 4
        case .classic: return 5
        case .epic: return 6
        }
    }

    var maxGuesses: Int {
        switch self {
        case .mini: return 5
        case .junior: return 6
        case .classic: return 6
        case .epic: return 7
        }
    }

    var answerFile: String {
        switch self {
        case .mini: return "allowed-answers-3"
        case .junior: return "allowed-answers-4"
        case .classic: return "allowed-answers"
        case .epic: return "allowed-answers-6"
        }
    }

    var guessFile: String {
        switch self {
        case .mini: return "allowed-guesses-3"
        case .junior: return "allowed-guesses-4"
        case .classic: return "allowed-guesses"
        case .epic: return "allowed-guesses-6"
        }
    }
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
    let mode: GameMode

    var dateString: String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000)
        return Self.dateFormatter.string(from: date)
    }

    enum CodingKeys: String, CodingKey {
        case timestamp
        case answer
        case won
        case guesses
        case mode
    }

    init(timestamp: Int64, answer: String, won: Bool, guesses: [String], mode: GameMode) {
        self.timestamp = timestamp
        self.answer = answer
        self.won = won
        self.guesses = guesses
        self.mode = mode
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        timestamp = try container.decode(Int64.self, forKey: .timestamp)
        answer = try container.decode(String.self, forKey: .answer)
        won = try container.decode(Bool.self, forKey: .won)
        guesses = try container.decode([String].self, forKey: .guesses)
        mode = (try? container.decode(GameMode.self, forKey: .mode)) ?? .classic
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(timestamp, forKey: .timestamp)
        try container.encode(answer, forKey: .answer)
        try container.encode(won, forKey: .won)
        try container.encode(guesses, forKey: .guesses)
        try container.encode(mode, forKey: .mode)
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
    var wordLength = 5
}

enum AppRoute {
    case home
    case game
    case history
    case stats
    case about
    case howToPlay
}
