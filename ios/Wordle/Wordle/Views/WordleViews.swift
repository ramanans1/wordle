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
    @State private var lastMenuFocusId: String = "play"

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            HomeScreen(
                onHistory: { route = .history },
                onStats: { route = .stats },
                onAbout: { route = .about },
                onHowToPlay: { route = .howToPlay },
                onReset: {},
                onStartMode: { mode in
                    viewModel.setMode(mode)
                    route = .game
                },
                focusedMenuId: $lastMenuFocusId
            )
                .environmentObject(viewModel)
                .opacity(route == .home ? 1 : 0)
                .allowsHitTesting(route == .home)

            WordleScreen(onBack: { route = .home })
                .environmentObject(viewModel)
                .opacity(route == .game ? 1 : 0)
                .allowsHitTesting(route == .game)

            HistoryWrapper(onBack: { route = .home })
                .environmentObject(viewModel)
                .opacity(route == .history ? 1 : 0)
                .allowsHitTesting(route == .history)

            StatsWrapper(onBack: { route = .home })
                .environmentObject(viewModel)
                .opacity(route == .stats ? 1 : 0)
                .allowsHitTesting(route == .stats)

            AboutWrapper(onBack: { route = .home })
                .opacity(route == .about ? 1 : 0)
                .allowsHitTesting(route == .about)

            HowToPlayWrapper(onBack: { route = .home })
                .opacity(route == .howToPlay ? 1 : 0)
                .allowsHitTesting(route == .howToPlay)

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
    @State private var showModePicker = false
    @State private var focusedModeId: String = GameMode.mini.id

    let onHistory: () -> Void
    let onStats: () -> Void
    let onAbout: () -> Void
    let onHowToPlay: () -> Void
    let onReset: () -> Void
    let onStartMode: (GameMode) -> Void
    @Binding var focusedMenuId: String

    var body: some View {
        ZStack {
            VStack {
                Spacer()
                VStack(spacing: 8) {
                    Text("My Wordle")
                        .font(appTitleFont)
                        .foregroundColor(.white)
                    Text("Designed for Mr. N Sekar")
                        .font(appBodyFont)
                        .foregroundColor(.gray)
                }

                MenuWheelView(
                    items: [
                        .init(id: "howto", title: "How to Play", action: onHowToPlay),
                        .init(id: "about", title: "About", action: onAbout),
                        .init(id: "play", title: "Play!", action: {
                            focusedMenuId = "play"
                            focusedModeId = GameMode.mini.id
                            showModePicker = true
                        }),
                        .init(id: "history", title: "History", action: onHistory),
                        .init(id: "stats", title: "Statistics", action: onStats)
                    ],
                    focusedId: $focusedMenuId,
                    rowHeight: 56,
                    focusFraction: 0.5,
                    rowFont: appSectionTitleFont
                )
                .frame(height: 260)
                .blur(radius: showModePicker ? 6 : 0)
                .opacity(showModePicker ? 0.6 : 1)
                .allowsHitTesting(!showModePicker)

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
            .onAppear { focusedMenuId = "play" }

            if showModePicker {
                ModePickerOverlay(
                    focusedModeId: $focusedModeId,
                    onDismiss: {
                        showModePicker = false
                        focusedMenuId = "play"
                    },
                    onSelect: { mode in
                        showModePicker = false
                        onStartMode(mode)
                    }
                )
            }
        }
    }
}

struct ModePickerOverlay: View {
    @Binding var focusedModeId: String
    let onDismiss: () -> Void
    let onSelect: (GameMode) -> Void

    var body: some View {
        GeometryReader { geo in
            let topHeight = geo.size.height * 0.3
            let bottomHeight = geo.size.height * 0.3

            ZStack {
                Color.black.opacity(0.0).ignoresSafeArea()

                VStack(spacing: 0) {
                    Color.clear
                        .frame(height: topHeight)
                        .contentShape(Rectangle())
                        .onTapGesture(perform: onDismiss)
                    Spacer()
                    Color.clear
                        .frame(height: bottomHeight)
                        .contentShape(Rectangle())
                        .onTapGesture(perform: onDismiss)
                }

                HorizontalWheelView(
                    items: GameMode.allCases.map { mode in
                        MenuWheelItem(id: mode.id, title: mode.label) { onSelect(mode) }
                    },
                    focusedId: $focusedModeId,
                    itemWidth: 170,
                    focusFraction: 0.5,
                    rowFont: appSectionTitleFont
                )
                .frame(height: 140)
            }
        }
    }
}

struct WordleScreen: View {
    @EnvironmentObject var viewModel: GameViewModel
    let onBack: () -> Void

    var body: some View {
        if viewModel.state.isLoading {
            ProgressView().progressViewStyle(.circular)
        } else {
            let tileSize = computeTileSize(state: viewModel.state)
            let isTabletPortrait = UIScreen.main.bounds.width >= 700 && UIScreen.main.bounds.height > UIScreen.main.bounds.width
            VStack(spacing: 12) {
                Text("My Wordle").font(appPageTitleFont).foregroundColor(.white)

                BoardView(
                    guesses: viewModel.state.guesses,
                    maxRows: viewModel.state.maxGuesses,
                    currentInput: viewModel.state.currentInput,
                    wordLength: viewModel.state.wordLength,
                    tileSize: tileSize
                )

                ZStack {
                    Rectangle().fill(Color.clear).frame(height: 42)
                    if let message = viewModel.state.message, !message.isEmpty {
                        Text(message)
                            .foregroundColor(viewModel.state.status == .won ? correctColor : (viewModel.state.status == .lost ? presentColor : .white))
                            .font(appBodyBoldFont)
                            .multilineTextAlignment(.center)
                    }
                }

                KeyboardView(
                    letterStates: viewModel.computeLetterStates(),
                    onLetter: viewModel.onKeyInput,
                    onDelete: viewModel.onDeleteInput,
                    onSubmit: viewModel.submitGuess
                )
                .scaleEffect(isTabletPortrait ? 1.2 : 1.0)
            }
            .padding(16)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(Color.black)
            .safeAreaInset(edge: .bottom) {
                HStack(spacing: 12) {
                    InvertibleOutlineButton(label: "New Game", action: { viewModel.startNewGame(clearMessage: true) })
                    InvertibleOutlineButton(label: "Back", action: onBack, borderColor: .gray)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color.black.opacity(0.9))
            }
        }
    }

    private func computeTileSize(state: GameUiState) -> CGFloat {
        let screen = UIScreen.main.bounds
        let horizontalPadding: CGFloat = 16
        let tileSpacing: CGFloat = 8
        let titleHeight: CGFloat = 40
        let messageHeight: CGFloat = 42
        let keyboardHeight: CGFloat = (3 * 40) + (3 * 6) + 40
        let bottomBarHeight: CGFloat = 66
        let interSpacing: CGFloat = 12 * 3
        let boardHeightBudget = screen.height - (titleHeight + messageHeight + keyboardHeight + bottomBarHeight + interSpacing + 16 + 40)
        let wordLength = max(state.wordLength, 1)
        let maxRows = max(state.maxGuesses, 1)
        let widthAvailable = screen.width - (horizontalPadding * 2)
        let widthSpacing = tileSpacing * CGFloat(max(wordLength - 1, 0))
        let heightSpacing = tileSpacing * CGFloat(max(maxRows - 1, 0))
        let widthSize = (widthAvailable - widthSpacing) / CGFloat(wordLength)
        let heightSize = (boardHeightBudget - heightSpacing) / CGFloat(maxRows)
        let isTabletPortrait = screen.width >= 700 && screen.height > screen.width
        let maxTile = isTabletPortrait ? 78.0 : 60.0
        let minTile = isTabletPortrait ? 32.0 : 28.0
        return min(maxTile, max(minTile, min(widthSize, heightSize)))
    }
}

struct BoardView: View {
    let guesses: [Guess]
    let maxRows: Int
    let currentInput: String
    let wordLength: Int
    let tileSize: CGFloat

    var body: some View {
        VStack(spacing: 8) {
            ForEach(0..<maxRows, id: \.self) { row in
                HStack(spacing: 8) {
                    ForEach(0..<wordLength, id: \.self) { col in
                        let guess = guesses.indices.contains(row) ? guesses[row] : nil
                        let letter = guess?.word[safe: col].map { String($0).uppercased() }
                            ?? (row == guesses.count ? currentInput[safe: col].map { String($0).uppercased() } : "")
                            ?? ""
                        let state = guess?.results[safe: col] ?? .unused
                        TileView(letter: letter, state: state, size: tileSize)
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
    let onSubmit: () -> Void

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
            HStack(spacing: 6) {
                KeyView(label: "⌫", state: .unused, width: 56, action: onDelete)
                KeyView(label: "Submit", state: .unused, width: 88, action: onSubmit)
            }
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
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color.black)
        .safeAreaInset(edge: .bottom) {
            InvertibleOutlineButton(label: "Back", action: onBack, borderColor: .gray)
                .padding(.horizontal, 16)
                .padding(.bottom, 10)
        }
    }
}

struct HistoryScreen: View {
    let entries: [GameHistoryEntry]
    @State private var displayedMonth = YearMonth.current
    @State private var selectedDate = Date()
    @State private var expandedId: Int64?
    @State private var selectedModes: Set<GameMode> = Set(GameMode.allCases)

    var body: some View {
        let filteredEntries = entries.filter { selectedModes.contains($0.mode) }
        let entriesByDate = Dictionary(grouping: filteredEntries) { $0.dateString }
        let selectedKey = Self.dateString(selectedDate)
        let selectedEntries = entriesByDate[selectedKey] ?? []
        let formattedDate = Self.formattedDateWithOrdinal(selectedDate)

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

            ModeToggleRow(
                selectedModes: selectedModes,
                onToggle: { mode in
                    if selectedModes.contains(mode) {
                        selectedModes.remove(mode)
                    } else {
                        selectedModes.insert(mode)
                    }
                }
            )
            .padding(.bottom, 8)
            .frame(maxWidth: .infinity, alignment: .center)

            Text(selectedEntries.isEmpty ? "No games played on \(formattedDate)" : "Games played on \(formattedDate)")
                .foregroundColor(.white)
                .font(appBodyBoldFont)
                .frame(maxWidth: .infinity, alignment: .center)

            if selectedEntries.isEmpty {
                EmptyView()
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

    static func formattedDateWithOrdinal(_ date: Date) -> String {
        let day = Calendar.current.component(.day, from: date)
        let formatter = DateFormatter()
        formatter.dateFormat = "LLLL"
        let month = formatter.string(from: date)
        let suffix: String
        let tens = (day % 100) / 10
        if tens == 1 {
            suffix = "th"
        } else {
            switch day % 10 {
            case 1: suffix = "st"
            case 2: suffix = "nd"
            case 3: suffix = "rd"
            default: suffix = "th"
            }
        }
        return "\(day)\(suffix) of \(month)"
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
            StatsScreen(entries: viewModel.history)
        }
        .padding(16)
        .background(Color.black)
        .safeAreaInset(edge: .bottom) {
            InvertibleOutlineButton(label: "Back", action: onBack, borderColor: .gray)
                .padding(.horizontal, 16)
                .padding(.bottom, 10)
        }
    }
}

struct StatsScreen: View {
    let entries: [GameHistoryEntry]
    @State private var selectedMode: GameMode? = nil

    var body: some View {
        let filteredEntries = entries.filter { $0.mode == (selectedMode ?? .classic) }
        VStack(spacing: 12) {
            if selectedMode == nil {
                Spacer()
                Text("Statistics").font(appSectionTitleFont).foregroundColor(.white)
                ModeToggleRow(
                    selectedModes: [],
                    onToggle: { mode in
                        selectedMode = mode
                    }
                )
                Spacer()
            } else if let selectedMode {
                Text("Statistics").font(appSectionTitleFont).foregroundColor(.white)
                ModeToggleRow(
                    selectedModes: Set([selectedMode]),
                    onToggle: { mode in
                        if selectedMode == mode {
                            self.selectedMode = nil
                        } else {
                            self.selectedMode = mode
                        }
                    }
                )

                Spacer()

                if filteredEntries.isEmpty {
                    Text("No games yet.").foregroundColor(.gray).font(appBodyFont)
                } else {
                    let total = filteredEntries.count
                    let wins = filteredEntries.filter(\.won).count
                    let winRate = min(max(Double(wins) / Double(total) * 100, 0), 100)
                    let maxGuesses = selectedMode.maxGuesses
                    let histogram = Dictionary(uniqueKeysWithValues: (1...maxGuesses).map { guessCount in
                        (guessCount, filteredEntries.filter { $0.won && $0.guesses.count == guessCount }.count)
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
                            ForEach(1...maxGuesses, id: \.self) { guess in
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

                Spacer()
            }
        }
    }
}

struct ModeToggleRow: View {
    let selectedModes: Set<GameMode>
    let onToggle: (GameMode) -> Void

    var body: some View {
        HStack(spacing: 8) {
            ForEach(GameMode.allCases) { mode in
                ModeToggleButton(
                    label: mode.label,
                    isSelected: selectedModes.contains(mode)
                ) {
                    onToggle(mode)
                }
            }
        }
    }
}

struct ModeToggleButton: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(appBodyBoldFont)
                .foregroundColor(isSelected ? Color(red: 0x0F/255, green: 0x17/255, blue: 0x2A/255) : .white)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(isSelected ? correctColor : Color.clear)
                )
        }
        .buttonStyle(.plain)
    }
}

struct AboutWrapper: View {
    let onBack: () -> Void
    @State private var focusedId: String = "a1"

    var body: some View {
        VStack {
            Spacer()
            VStack(spacing: 8) {
                Text("About").font(appSectionTitleFont).foregroundColor(.white)
                MenuWheelView(
                    items: [
                        .init(id: "a1", title: "My Wordle is a word puzzle where you guess the hidden word.", action: {}),
                        .init(id: "a2", title: "Four ranks to grow into: Pupil, Scribe, Author, Wordsmith.", action: {}),
                        .init(id: "a3", title: "Pupil and Scribe are shorter words. Author and Wordsmith are longer.", action: {}),
                        .init(id: "a4", title: "Play offline and let the calendar keep your victories.", action: {})
                    ],
                    focusedId: $focusedId,
                    rowHeight: 52,
                    focusFraction: 0.18,
                    rowFont: appBodyFont
                )
                .frame(height: 220)
            }
            Spacer()
            InvertibleOutlineButton(label: "Back", action: onBack, borderColor: .gray)
        }
        .padding(16)
        .background(Color.black)
    }
}

struct HowToPlayWrapper: View {
    let onBack: () -> Void
    @State private var focusedId: String = "h1"

    var body: some View {
        VStack {
            Spacer()
            VStack(spacing: 8) {
                Text("How to Play").font(appSectionTitleFont).foregroundColor(.white)
                MenuWheelView(
                    items: [
                        .init(id: "h1", title: "Choose a rank, then try to guess the secret word.", action: {}),
                        .init(id: "h2", title: "Pupil is 3 letters, Scribe is 4.", action: {}),
                        .init(id: "h3", title: "Author is 5 letters, Wordsmith is 6.", action: {}),
                        .init(id: "h4", title: "Green => right letter, right spot.", action: {}),
                        .init(id: "h5", title: "Yellow => right letter, wrong spot.", action: {}),
                        .init(id: "h6", title: "Gray => not in the word.", action: {}),
                        .init(id: "h7", title: "Good luck!", action: {})
                    ],
                    focusedId: $focusedId,
                    rowHeight: 52,
                    focusFraction: 0.18,
                    rowFont: appBodyFont
                )
                .frame(height: 220)
            }
            Spacer()
            InvertibleOutlineButton(label: "Back", action: onBack, borderColor: .gray)
        }
        .padding(16)
        .background(Color.black)
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
                .foregroundColor(borderColor)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .frame(minWidth: 110)
                .contentShape(Rectangle())
                .opacity(pressed ? 0.6 : 1.0)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(DragGesture(minimumDistance: 0).onChanged { _ in pressed = true }.onEnded { _ in pressed = false })
    }
}

struct MenuWheelItem: Hashable, Identifiable {
    let id: String
    let title: String
    let action: () -> Void

    static func == (lhs: MenuWheelItem, rhs: MenuWheelItem) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct MenuWheelView: View {
    let items: [MenuWheelItem]
    @Binding var focusedId: String
    let rowHeight: CGFloat
    let focusFraction: CGFloat
    let rowFont: Font

    @State private var itemFrames: [String: CGRect] = [:]
    @State private var snapWorkItem: DispatchWorkItem?

    var body: some View {
        GeometryReader { outer in
            let focusY = outer.size.height * focusFraction
            let topPadding = max(focusY - (rowHeight / 2), 0)
            let bottomPadding = max(outer.size.height - focusY - (rowHeight / 2), 0)

            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 14) {
                        ForEach(items) { item in
                            MenuWheelRow(
                                title: item.title,
                                focusY: focusY,
                                rowHeight: rowHeight,
                                rowFont: rowFont
                            )
                            .id(item.id)
                            .background(
                                GeometryReader { geo in
                                    Color.clear
                                        .preference(
                                            key: MenuWheelFrameKey.self,
                                            value: [item.id: geo.frame(in: .named("wheel"))]
                                        )
                                }
                            )
                            .onTapGesture {
                                focusedId = item.id
                                item.action()
                            }
                        }
                    }
                    .padding(.top, topPadding)
                    .padding(.bottom, bottomPadding)
                }
                .coordinateSpace(name: "wheel")
                .onPreferenceChange(MenuWheelFrameKey.self) { value in
                    itemFrames.merge(value) { $1 }
                    scheduleSnap(focusY: focusY, proxy: proxy)
                }
                .gesture(
                    DragGesture().onEnded { _ in
                        snapToNearest(focusY: focusY, proxy: proxy)
                    }
                )
                .onAppear { scrollToFocused(proxy: proxy) }
            }
        }
    }

    private func snapToNearest(focusY: CGFloat, proxy: ScrollViewProxy) {
        guard !itemFrames.isEmpty else { return }
        let nearest = itemFrames.min { abs($0.value.midY - focusY) < abs($1.value.midY - focusY) }
        if let target = nearest?.key {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                proxy.scrollTo(target, anchor: UnitPoint(x: 0.5, y: focusFraction))
            }
            focusedId = target
        }
    }

    private func scheduleSnap(focusY: CGFloat, proxy: ScrollViewProxy) {
        snapWorkItem?.cancel()
        let workItem = DispatchWorkItem {
            snapToNearest(focusY: focusY, proxy: proxy)
        }
        snapWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15, execute: workItem)
    }

    private func scrollToFocused(proxy: ScrollViewProxy) {
        DispatchQueue.main.async {
            withAnimation(.easeOut(duration: 0.3)) {
                proxy.scrollTo(focusedId, anchor: UnitPoint(x: 0.5, y: focusFraction))
            }
        }
    }
}

struct HorizontalWheelView: View {
    let items: [MenuWheelItem]
    @Binding var focusedId: String
    let itemWidth: CGFloat
    let focusFraction: CGFloat
    let rowFont: Font

    @State private var itemFrames: [String: CGRect] = [:]
    @State private var snapWorkItem: DispatchWorkItem?

    var body: some View {
        GeometryReader { outer in
            let focusX = outer.size.width * focusFraction
            let leadingPadding = max(focusX - (itemWidth / 2), 0)
            let trailingPadding = max(outer.size.width - focusX - (itemWidth / 2), 0)

            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 18) {
                        ForEach(items) { item in
                            HorizontalWheelRow(
                                title: item.title,
                                focusX: focusX,
                                itemWidth: itemWidth,
                                rowFont: rowFont
                            )
                            .id(item.id)
                            .background(
                                GeometryReader { geo in
                                    Color.clear
                                        .preference(
                                            key: HorizontalWheelFrameKey.self,
                                            value: [item.id: geo.frame(in: .named("wheelh"))]
                                        )
                                }
                            )
                            .onTapGesture {
                                focusedId = item.id
                                item.action()
                            }
                        }
                    }
                    .padding(.leading, leadingPadding)
                    .padding(.trailing, trailingPadding)
                }
                .coordinateSpace(name: "wheelh")
                .onPreferenceChange(HorizontalWheelFrameKey.self) { value in
                    itemFrames.merge(value) { $1 }
                    scheduleSnap(focusX: focusX, proxy: proxy)
                }
                .gesture(
                    DragGesture().onEnded { _ in
                        snapToNearest(focusX: focusX, proxy: proxy)
                    }
                )
                .onAppear { scrollToFocused(proxy: proxy) }
            }
        }
    }

    private func snapToNearest(focusX: CGFloat, proxy: ScrollViewProxy) {
        guard !itemFrames.isEmpty else { return }
        let nearest = itemFrames.min { abs($0.value.midX - focusX) < abs($1.value.midX - focusX) }
        if let target = nearest?.key {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                proxy.scrollTo(target, anchor: UnitPoint(x: focusFraction, y: 0.5))
            }
            focusedId = target
        }
    }

    private func scheduleSnap(focusX: CGFloat, proxy: ScrollViewProxy) {
        snapWorkItem?.cancel()
        let workItem = DispatchWorkItem {
            snapToNearest(focusX: focusX, proxy: proxy)
        }
        snapWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15, execute: workItem)
    }

    private func scrollToFocused(proxy: ScrollViewProxy) {
        DispatchQueue.main.async {
            withAnimation(.easeOut(duration: 0.3)) {
                proxy.scrollTo(focusedId, anchor: UnitPoint(x: focusFraction, y: 0.5))
            }
        }
    }
}

private struct MenuWheelRow: View {
    let title: String
    let focusY: CGFloat
    let rowHeight: CGFloat
    let rowFont: Font

    var body: some View {
        GeometryReader { geo in
            let midY = geo.frame(in: .named("wheel")).midY
            let distance = abs(midY - focusY)
            let maxDistance = max(focusY + rowHeight, rowHeight * 3)
            let factor = min(distance / max(maxDistance, 1), 1)
            let scale = 1.0 - (0.24 * factor)
            let opacity = 1.0 - (0.6 * factor)
            let blur = 0.0 + (3.0 * factor)
            let rotation = Double((midY - focusY) / max(maxDistance, 1)) * 18

            Text(title)
                .font(rowFont)
                .foregroundColor(.white)
                .scaleEffect(scale)
                .opacity(opacity)
                .blur(radius: blur)
                .rotation3DEffect(.degrees(rotation), axis: (x: 1, y: 0, z: 0))
                .frame(maxWidth: .infinity, minHeight: rowHeight)
        }
        .frame(height: rowHeight)
    }
}

private struct MenuWheelFrameKey: PreferenceKey {
    static var defaultValue: [String: CGRect] = [:]
    static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) {
        value.merge(nextValue()) { $1 }
    }
}

private struct HorizontalWheelRow: View {
    let title: String
    let focusX: CGFloat
    let itemWidth: CGFloat
    let rowFont: Font

    var body: some View {
        GeometryReader { geo in
            let midX = geo.frame(in: .named("wheelh")).midX
            let distance = abs(midX - focusX)
            let maxDistance = max(focusX + itemWidth, itemWidth * 3)
            let factor = min(distance / max(maxDistance, 1), 1)
            let scale = 1.0 - (0.24 * factor)
            let opacity = 1.0 - (0.6 * factor)
            let blur = 0.0 + (3.0 * factor)
            let rotation = Double((midX - focusX) / max(maxDistance, 1)) * -18

            Text(title)
                .font(rowFont)
                .foregroundColor(.white)
                .scaleEffect(scale)
                .opacity(opacity)
                .blur(radius: blur)
                .rotation3DEffect(.degrees(rotation), axis: (x: 0, y: 1, z: 0))
                .frame(minWidth: itemWidth, maxHeight: .infinity)
        }
        .frame(width: itemWidth)
    }
}

private struct HorizontalWheelFrameKey: PreferenceKey {
    static var defaultValue: [String: CGRect] = [:]
    static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) {
        value.merge(nextValue()) { $1 }
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
