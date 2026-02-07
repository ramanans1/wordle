import SwiftUI

private let correctColor = Color(red: 0x22/255, green: 0xC5/255, blue: 0x5E/255)
private let presentColor = Color(red: 0xF5/255, green: 0x9E/255, blue: 0x0B/255)
private let absentColor = Color(red: 0x1F/255, green: 0x29/255, blue: 0x37/255)
private let unusedColor = Color(red: 0x11/255, green: 0x18/255, blue: 0x27/255)

private let appFontRegularName = "Merriweather24pt-Regular"
private let appFontSemiBoldName = "Merriweather24pt-SemiBold"
private let appFontBoldName = "Merriweather24pt-Bold"
private let appFontBlackName = "Merriweather24pt-Black"

private func appFont(_ name: String, _ size: CGFloat) -> Font {
    .custom(name, size: size)
}

private let appSplashFont = appFont(appFontBlackName, 42)
private let appTitleFont = appFont(appFontBlackName, 36)
private let appPageTitleFont = appFont(appFontBoldName, 30)
private let appSectionTitleFont = appFont(appFontBoldName, 24)
private let appBodyFont = appFont(appFontRegularName, 16)
private let appBodyBoldFont = appFont(appFontSemiBoldName, 16)
private let appCaptionFont = appFont(appFontRegularName, 12)
private let appCaptionBoldFont = appFont(appFontSemiBoldName, 12)
private let appTileFont = appFont(appFontBlackName, 20)
private let appKeyboardFont = appFont(appFontBoldName, 16)


struct RootView: View {
    @StateObject var viewModel = GameViewModel()
    @State private var route: AppRoute = .home
    @State private var showSplash = true

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch route {
            case .home:
                HomeScreen(onPlay: { route = .game }, onHistory: { route = .history }, onStats: { route = .stats }, onReset: {})
                    .environmentObject(viewModel)
            case .game:
                WordleScreen(onBack: { route = .home }).environmentObject(viewModel)
            case .history:
                HistoryWrapper(onBack: { route = .home }).environmentObject(viewModel)
            case .stats:
                StatsWrapper(onBack: { route = .home }).environmentObject(viewModel)
            }

            if showSplash {
                SplashView()
                    .transition(.opacity)
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            withAnimation { showSplash = false }
                        }
                    }
            }
        }
    }
}

struct SplashView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            Text("My Wordle")
                .font(appSplashFont)
                .foregroundColor(.white)
        }
    }
}

struct HomeScreen: View {
    @EnvironmentObject var viewModel: GameViewModel
    @State private var showConfirm = false
    @State private var resetMessage: String?

    let onPlay: () -> Void
    let onHistory: () -> Void
    let onStats: () -> Void
    let onReset: () -> Void

    var body: some View {
        VStack {
            Spacer()
            VStack(spacing: 12) {
                Text("My Wordle")
                    .font(appTitleFont)
                    .foregroundColor(.white)
                Text("Designed for Mr. N Sekar")
                    .font(appBodyFont)
                    .foregroundColor(.gray)
                InvertibleOutlineButton(label: "Play!", action: onPlay)
                InvertibleOutlineButton(label: "History", action: onHistory)
                InvertibleOutlineButton(label: "Statistics", action: onStats)
            }
            Spacer()

            if showConfirm {
                Text("This will erase all progress and restart the word sequence.")
                    .font(appCaptionFont)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                HStack(spacing: 10) {
                    InvertibleOutlineButton(label: "Yes") {
                        viewModel.fullReset()
                        onReset()
                        showConfirm = false
                        resetMessage = "Fully reset!"
                    }
                    InvertibleOutlineButton(label: "No, go back", action: { showConfirm = false }, borderColor: Color.gray)
                }
            } else {
                Text("Full Reset")
                    .foregroundColor(.gray)
                    .font(appBodyBoldFont)
                    .onTapGesture { showConfirm = true }
            }

            if let resetMessage {
                Text(resetMessage).foregroundColor(correctColor).font(appBodyBoldFont)
            }
        }
        .padding(24)
        .background(Color.black)
    }
}

struct WordleScreen: View {
    @EnvironmentObject var viewModel: GameViewModel
    let onBack: () -> Void

    var body: some View {
        if viewModel.state.isLoading {
            ProgressView().progressViewStyle(.circular)
        } else {
            ScrollView {
                VStack(spacing: 12) {
                    Text("My Wordle").font(appPageTitleFont).foregroundColor(.white)

                    BoardView(guesses: viewModel.state.guesses, maxRows: viewModel.state.maxGuesses, currentInput: viewModel.state.currentInput)

                    ZStack {
                        Rectangle().fill(Color.clear).frame(height: 42)
                        if let message = viewModel.state.message, !message.isEmpty {
                            Text(message)
                                .foregroundColor(viewModel.state.status == .won ? correctColor : (viewModel.state.status == .lost ? presentColor : .white))
                                .font(appBodyBoldFont)
                                .multilineTextAlignment(.center)
                        }
                    }

                    HStack(spacing: 12) {
                        InvertibleOutlineButton(label: "Submit", action: viewModel.submitGuess)
                        InvertibleOutlineButton(label: "New Game", action: { viewModel.startNewGame(clearMessage: true) })
                    }

                    KeyboardView(letterStates: viewModel.computeLetterStates(), onLetter: viewModel.onKeyInput, onDelete: viewModel.onDeleteInput)

                    InvertibleOutlineButton(label: "Back", action: onBack, borderColor: .gray)
                }
                .padding(16)
            }
            .background(Color.black)
        }
    }
}

struct BoardView: View {
    let guesses: [Guess]
    let maxRows: Int
    let currentInput: String

    var body: some View {
        let side = min(UIScreen.main.bounds.width, UIScreen.main.bounds.height) * 0.11
        let size = min(max(side, 42), 64)
        VStack(spacing: 8) {
            ForEach(0..<maxRows, id: \.self) { row in
                HStack(spacing: 8) {
                    ForEach(0..<5, id: \.self) { col in
                        let guess = guesses.indices.contains(row) ? guesses[row] : nil
                        let letter = guess?.word[safe: col].map { String($0).uppercased() }
                            ?? (row == guesses.count ? currentInput[safe: col].map { String($0).uppercased() } : "")
                            ?? ""
                        let state = guess?.results[safe: col] ?? .unused
                        TileView(letter: letter, state: state, size: size)
                    }
                }
            }
        }
    }
}

struct TileView: View {
    let letter: String
    let state: LetterState
    let size: CGFloat

    var body: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(color)
            .frame(width: size, height: size)
            .overlay(Text(letter).font(appTileFont).foregroundColor(textColor))
    }

    private var color: Color {
        switch state {
        case .correct: return correctColor
        case .present: return presentColor
        case .absent: return absentColor
        case .unused: return unusedColor
        }
    }

    private var textColor: Color {
        (state == .unused || state == .absent) ? Color.white : Color(red: 0x0F/255, green: 0x17/255, blue: 0x2A/255)
    }
}

struct KeyboardView: View {
    let letterStates: [Character: LetterState]
    let onLetter: (Character) -> Void
    let onDelete: () -> Void

    private let rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"]

    var body: some View {
        VStack(spacing: 6) {
            ForEach(rows, id: \.self) { row in
                HStack(spacing: 6) {
                    ForEach(Array(row), id: \.self) { letter in
                        KeyView(label: String(letter), state: letterStates[Character(letter.lowercased())] ?? .unused, action: { onLetter(Character(letter.lowercased())) })
                    }
                }
            }
            KeyView(label: "⌫", state: .unused, width: 56, action: onDelete)
        }
    }
}

struct KeyView: View {
    let label: String
    let state: LetterState
    var width: CGFloat = 28
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            RoundedRectangle(cornerRadius: 6)
                .fill(background)
                .frame(width: width, height: 40)
                .overlay(Text(label).font(appKeyboardFont).foregroundColor(text))
        }
        .buttonStyle(.plain)
    }

    private var background: Color {
        switch state {
        case .correct: return correctColor
        case .present: return presentColor
        case .absent: return absentColor
        case .unused: return .white
        }
    }

    private var text: Color {
        switch state {
        case .unused: return Color(red: 0x0F/255, green: 0x17/255, blue: 0x2A/255)
        case .absent: return Color(red: 0xE5/255, green: 0xE7/255, blue: 0xEB/255)
        default: return Color(red: 0x0F/255, green: 0x17/255, blue: 0x2A/255)
        }
    }
}

struct HistoryWrapper: View {
    @EnvironmentObject var viewModel: GameViewModel
    let onBack: () -> Void

    var body: some View {
        VStack {
            Text("History").font(appSectionTitleFont).foregroundColor(.white)
            HistoryScreen(entries: viewModel.history)
            InvertibleOutlineButton(label: "Back", action: onBack, borderColor: .gray)
        }
        .padding(16)
        .background(Color.black)
    }
}

struct HistoryScreen: View {
    let entries: [GameHistoryEntry]
    @State private var displayedMonth = YearMonth.current
    @State private var selectedDate = Date()
    @State private var expandedId: Int64?

    var body: some View {
        let entriesByDate = Dictionary(grouping: entries) { $0.dateString }
        let selectedKey = Self.dateString(selectedDate)
        let selectedEntries = entriesByDate[selectedKey] ?? []

        VStack(alignment: .leading) {
            HStack {
                Text("‹").foregroundColor(.white).font(appBodyBoldFont).padding(8).onTapGesture {
                    displayedMonth = displayedMonth.previous
                    selectedDate = displayedMonth.firstDate
                }
                Spacer()
                Text(displayedMonth.title).foregroundColor(.white).font(appBodyBoldFont)
                Spacer()
                Text("›").foregroundColor(.white).font(appBodyBoldFont).padding(8).onTapGesture {
                    displayedMonth = displayedMonth.next
                    selectedDate = displayedMonth.firstDate
                }
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 7), spacing: 8) {
                ForEach(displayedMonth.gridDates, id: \.self) { date in
                    if let date {
                        let key = Self.dateString(date)
                        let hasGames = entriesByDate[key] != nil
                        let isSelected = Calendar.current.isDate(date, inSameDayAs: selectedDate)
                        let bg = isSelected ? Color(red: 0x38/255, green: 0xBD/255, blue: 0xF8/255) : (hasGames ? correctColor : absentColor)
                        let fg = (hasGames || isSelected) ? Color(red: 0x0F/255, green: 0x17/255, blue: 0x2A/255) : Color.white
                        RoundedRectangle(cornerRadius: 6)
                            .fill(bg)
                            .frame(width: 36, height: 36)
                            .overlay(Text("\(Calendar.current.component(.day, from: date))").foregroundColor(fg).font(appCaptionBoldFont))
                            .onTapGesture { selectedDate = date }
                    } else {
                        Color.clear.frame(width: 36, height: 36)
                    }
                }
            }
            .padding(.bottom, 12)

            Text("Games on \(selectedKey)").foregroundColor(.white).font(appBodyBoldFont)

            if selectedEntries.isEmpty {
                Text("No games played.").foregroundColor(.gray).font(appBodyFont)
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(selectedEntries) { entry in
                            HistoryCard(entry: entry, expanded: expandedId == entry.id, onToggle: {
                                expandedId = expandedId == entry.id ? nil : entry.id
                            })
                        }
                    }
                }
            }
        }
    }

    static func dateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

struct HistoryCard: View {
    let entry: GameHistoryEntry
    let expanded: Bool
    let onToggle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(entry.answer.uppercased()).foregroundColor(.white).font(appBodyBoldFont)
                Spacer()
                Text(entry.won ? "Won" : "Lost")
                    .foregroundColor(entry.won ? correctColor : Color(red: 0xEF/255, green: 0x44/255, blue: 0x44/255))
                    .font(appBodyBoldFont)
            }

            if expanded {
                FlexibleView(data: entry.guesses, spacing: 6, alignment: .leading) { guess in
                    Text(guess.uppercased())
                        .foregroundColor(.white)
                        .font(appCaptionBoldFont)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(RoundedRectangle(cornerRadius: 4).fill(absentColor))
                }
            }
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 10).fill(Color(red: 0x0F/255, green: 0x17/255, blue: 0x2A/255)))
        .onTapGesture(perform: onToggle)
    }
}

struct StatsWrapper: View {
    @EnvironmentObject var viewModel: GameViewModel
    let onBack: () -> Void

    var body: some View {
        VStack {
            Text("Statistics").font(appSectionTitleFont).foregroundColor(.white)
            StatsScreen(entries: viewModel.history)
            InvertibleOutlineButton(label: "Back", action: onBack, borderColor: .gray)
        }
        .padding(16)
        .background(Color.black)
    }
}

struct StatsScreen: View {
    let entries: [GameHistoryEntry]

    var body: some View {
        if entries.isEmpty {
            VStack { Spacer(); Text("No games yet.").foregroundColor(.gray).font(appBodyFont); Spacer() }
        } else {
            let total = entries.count
            let wins = entries.filter(\.won).count
            let winRate = min(max(Double(wins) / Double(total) * 100, 0), 100)
            let histogram = Dictionary(uniqueKeysWithValues: (1...6).map { guessCount in
                (guessCount, entries.filter { $0.won && $0.guesses.count == guessCount }.count)
            })
            let maxCount = histogram.values.max() ?? 1
            let minCount = histogram.values.min() ?? 0

            VStack(spacing: 12) {
                HStack {
                    VStack { Text("Games Played").foregroundColor(.white).font(appBodyBoldFont); Text("\(total)").foregroundColor(.white).font(appBodyFont) }
                    Spacer()
                    VStack { Text("Win Percentage").foregroundColor(.white).font(appBodyBoldFont); Text(String(format: "%.1f%%", winRate)).foregroundColor(.white).font(appBodyFont) }
                }

                Text("Guess Distribution").foregroundColor(.white).font(appBodyBoldFont)
                Text("Number of games by guess count").foregroundColor(.gray).font(appCaptionFont)

                VStack(spacing: 8) {
                    ForEach(1...6, id: \.self) { guess in
                        let count = histogram[guess] ?? 0
                        let factor = maxCount == minCount ? 1.0 : Double(count - minCount) / Double(maxCount - minCount)
                        let barColor = Color.interpolate(from: Color(red: 0x0B/255, green: 0x4C/255, blue: 0x2D/255), to: Color(red: 0xA7/255, green: 0xF3/255, blue: 0xD0/255), factor: factor)
                        HStack(spacing: 8) {
                            Text("\(guess)").foregroundColor(.white).font(appBodyBoldFont)
                            GeometryReader { geo in
                                HStack(spacing: 0) {
                                    RoundedRectangle(cornerRadius: 6)
                                        .fill(barColor)
                                        .frame(width: geo.size.width * max(Double(count) / Double(max(maxCount, 1)), 0.05), height: 28)
                                        .overlay(alignment: .leading) {
                                            Text("\(count)")
                                                .foregroundColor(factor > 0.5 ? Color(red: 0x0F/255, green: 0x17/255, blue: 0x2A/255) : Color.white)
                                                .font(appCaptionBoldFont)
                                                .padding(.leading, 6)
                                        }
                                    Spacer(minLength: 0)
                                }
                            }
                            .frame(height: 28)
                        }
                    }
                }
            }
        }
    }
}

struct InvertibleOutlineButton: View {
    let label: String
    let action: () -> Void
    var borderColor: Color = .white

    @State private var pressed = false

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(appBodyBoldFont)
                .foregroundColor(pressed ? Color.black : borderColor)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .frame(minWidth: 110)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(pressed ? .white : .clear)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(borderColor, lineWidth: 1.5))
                )
        }
        .buttonStyle(.plain)
        .simultaneousGesture(DragGesture(minimumDistance: 0).onChanged { _ in pressed = true }.onEnded { _ in pressed = false })
    }
}

private struct YearMonth {
    let year: Int
    let month: Int

    static var current: YearMonth {
        let c = Calendar.current.dateComponents([.year, .month], from: Date())
        return YearMonth(year: c.year ?? 2024, month: c.month ?? 1)
    }

    var title: String {
        let date = firstDate
        let formatter = DateFormatter()
        formatter.dateFormat = "LLLL yyyy"
        return formatter.string(from: date)
    }

    var firstDate: Date {
        Calendar.current.date(from: DateComponents(year: year, month: month, day: 1)) ?? Date()
    }

    var previous: YearMonth {
        let date = Calendar.current.date(byAdding: .month, value: -1, to: firstDate) ?? firstDate
        let c = Calendar.current.dateComponents([.year, .month], from: date)
        return .init(year: c.year ?? year, month: c.month ?? month)
    }

    var next: YearMonth {
        let date = Calendar.current.date(byAdding: .month, value: 1, to: firstDate) ?? firstDate
        let c = Calendar.current.dateComponents([.year, .month], from: date)
        return .init(year: c.year ?? year, month: c.month ?? month)
    }

    var gridDates: [Date?] {
        let cal = Calendar.current
        let range = cal.range(of: .day, in: .month, for: firstDate) ?? 1..<2
        let weekday = cal.component(.weekday, from: firstDate) - 1
        let lead = Array(repeating: Optional<Date>.none, count: weekday)
        let days = range.compactMap { cal.date(from: DateComponents(year: year, month: month, day: $0)) }.map(Optional.some)
        return lead + days
    }
}

private struct FlexibleView<Data: Collection, Content: View>: View where Data.Element: Hashable {
    let data: Data
    let spacing: CGFloat
    let alignment: HorizontalAlignment
    let content: (Data.Element) -> Content

    init(data: Data, spacing: CGFloat, alignment: HorizontalAlignment, @ViewBuilder content: @escaping (Data.Element) -> Content) {
        self.data = data
        self.spacing = spacing
        self.alignment = alignment
        self.content = content
    }

    var body: some View {
        VStack(alignment: alignment, spacing: spacing) {
            ForEach(Array(data), id: \.self) { item in
                content(item)
            }
        }
    }
}

private extension String {
    subscript(safe index: Int) -> Character? {
        guard index >= 0 && index < count else { return nil }
        return self[self.index(startIndex, offsetBy: index)]
    }
}

private extension Color {
    static func interpolate(from: Color, to: Color, factor: Double) -> Color {
        let f = min(max(factor, 0), 1)
        let fromUi = UIColor(from)
        let toUi = UIColor(to)
        var fr: CGFloat = 0, fg: CGFloat = 0, fb: CGFloat = 0, fa: CGFloat = 0
        var tr: CGFloat = 0, tg: CGFloat = 0, tb: CGFloat = 0, ta: CGFloat = 0
        fromUi.getRed(&fr, green: &fg, blue: &fb, alpha: &fa)
        toUi.getRed(&tr, green: &tg, blue: &tb, alpha: &ta)
        return Color(red: Double(fr + (tr - fr) * f), green: Double(fg + (tg - fg) * f), blue: Double(fb + (tb - fb) * f), opacity: Double(fa + (ta - fa) * f))
    }
}
