package com.example.wordle

import android.app.Application
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewModelScope
import com.example.wordle.data.GameHistoryEntry
import com.example.wordle.data.HistoryRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import kotlin.random.Random

private const val MAX_GUESSES = 6
private const val WORD_LENGTH = 5
private const val WORDLIST_ASSET = "clean_five_letter_words.txt"

private val CorrectColor = Color(0xFF22C55E)
private val PresentColor = Color(0xFFF59E0B)
private val AbsentColor = Color(0xFF1F2937)
private val UnusedColor = Color(0xFF111827)

enum class GameStatus { IN_PROGRESS, WON, LOST }
enum class LetterState { UNUSED, ABSENT, PRESENT, CORRECT }

data class Guess(val word: String, val results: List<LetterState>)

data class GameUiState(
    val isLoading: Boolean = true,
    val message: String? = null,
    val guesses: List<Guess> = emptyList(),
    val currentInput: String = "",
    val status: GameStatus = GameStatus.IN_PROGRESS,
    val maxGuesses: Int = MAX_GUESSES
)

class GameViewModel(application: Application) : AndroidViewModel(application) {
    private val fallbackWords = listOf(
        "apple", "baker", "cabin", "delta", "eagle", "fancy",
        "giant", "habit", "ideal", "joker", "lemon", "magic"
    )
    private val rareDoubles = listOf("zz", "xx", "qq", "yy", "jj", "ww")
    private val letterFrequency = mapOf(
        'e' to 12.0f,
        't' to 9.1f,
        'a' to 8.1f,
        'o' to 7.7f,
        'i' to 7.3f,
        'n' to 7.0f,
        's' to 6.3f,
        'r' to 6.0f,
        'h' to 5.9f,
        'l' to 4.0f,
        'd' to 3.8f,
        'c' to 2.7f,
        'u' to 2.7f,
        'm' to 2.5f,
        'w' to 2.4f,
        'f' to 2.2f,
        'g' to 2.0f,
        'y' to 2.0f,
        'p' to 1.8f,
        'b' to 1.5f,
        'v' to 1.1f,
        'k' to 0.7f,
        'j' to 0.1f,
        'x' to 0.1f,
        'q' to 0.1f,
        'z' to 0.1f
    )
    private val answerPoolSize = 3500
    private val historyRepository = HistoryRepository(application)

    private val _state = MutableStateFlow(GameUiState())
    val state: StateFlow<GameUiState> = _state

    val historyFlow = historyRepository.historyFlow()

    private var answer: String = ""
    private var wordList: List<String> = fallbackWords
    private var answerList: List<String> = fallbackWords
    private var wordSet: Set<String> = fallbackWords.toSet()
    private val random = Random(12345L)

    init {
        loadWords()
    }

    private fun loadWords() {
        _state.value = _state.value.copy(isLoading = true)
        viewModelScope.launch {
            val loaded = withContext(Dispatchers.IO) {
                runCatching { readWordsFromAssets() }.getOrElse { fallbackWords }
            }
            wordList = loaded
            answerList = loaded
                .filter { isAnswerCandidate(it) }
                .sortedByDescending { scoreWord(it) }
                .take(answerPoolSize)
                .ifEmpty { loaded }
            wordSet = loaded.toSet()
            startNewGame(clearMessage = true)
            _state.value = _state.value.copy(isLoading = false)
        }
    }

    private fun readWordsFromAssets(): List<String> {
        val assetManager = getApplication<Application>().assets
        val words = mutableListOf<String>()
        assetManager.open(WORDLIST_ASSET).bufferedReader().use { reader ->
            reader.forEachLine { line ->
                val word = line.trim().lowercase()
                if (word.length == WORD_LENGTH &&
                    word.all { it.isLetter() } &&
                    word.any { it in "aeiou" } &&
                    !(word.endsWith("s") && !word.endsWith("ss"))
                ) {
                    words.add(word)
                }
            }
        }
        return words.ifEmpty { fallbackWords }
    }

    private fun isAnswerCandidate(word: String): Boolean {
        return word.length == WORD_LENGTH &&
            word.all { it.isLetter() } &&
            word.any { it in "aeiou" } &&
            !(word.endsWith("s") && !word.endsWith("ss")) &&
            rareDoubles.none { word.contains(it) } &&
            word.toSet().size >= 4
    }

    private fun scoreWord(word: String): Float {
        val uniques = word.toSet()
        val duplicatePenalty = (word.length - uniques.size) * 2f
        val base = uniques.sumOf { letterFrequency[it]?.toDouble() ?: 0.0 }.toFloat()
        return base - duplicatePenalty
    }

    fun onInputChanged(value: String) {
        if (_state.value.status != GameStatus.IN_PROGRESS) return
        val cleaned = value.filter { it.isLetter() }.take(WORD_LENGTH).lowercase()
        _state.value = _state.value.copy(currentInput = cleaned)
    }

    fun onKeyInput(letter: Char) {
        if (_state.value.status != GameStatus.IN_PROGRESS) return
        val current = _state.value.currentInput
        if (current.length >= WORD_LENGTH) return
        val updated = (current + letter.lowercaseChar()).take(WORD_LENGTH)
        _state.value = _state.value.copy(currentInput = updated)
    }

    fun onDeleteInput() {
        if (_state.value.status != GameStatus.IN_PROGRESS) return
        val current = _state.value.currentInput
        if (current.isEmpty()) return
        _state.value = _state.value.copy(currentInput = current.dropLast(1))
    }

    fun submitGuess() {
        val guess = _state.value.currentInput.lowercase()
        if (_state.value.status != GameStatus.IN_PROGRESS) {
            _state.value = _state.value.copy(message = "Start a new game.")
            return
        }
        if (guess.length != WORD_LENGTH) {
            _state.value = _state.value.copy(message = "Enter a $WORD_LENGTH-letter word.")
            return
        }
        if (!wordSet.contains(guess)) {
            _state.value = _state.value.copy(message = "Not in the word list.")
            return
        }

        val results = scoreGuess(answer, guess)
        val updatedGuesses = _state.value.guesses + Guess(guess, results)
        val status = when {
            guess == answer -> GameStatus.WON
            updatedGuesses.size >= MAX_GUESSES -> GameStatus.LOST
            else -> GameStatus.IN_PROGRESS
        }
        val message = when (status) {
            GameStatus.WON -> "You solved it! The word was ${answer.uppercase()}."
            GameStatus.LOST -> "Out of guesses. The word was ${answer.uppercase()}."
            GameStatus.IN_PROGRESS -> ""
        }

        _state.value = _state.value.copy(
            guesses = updatedGuesses,
            status = status,
            currentInput = "",
            message = message
        )

        if (status != GameStatus.IN_PROGRESS) {
            viewModelScope.launch {
                historyRepository.addEntry(
                    GameHistoryEntry(
                        timestamp = System.currentTimeMillis(),
                        answer = answer,
                        won = status == GameStatus.WON,
                        guesses = updatedGuesses.map { it.word }
                    )
                )
            }
        }
    }

    fun startNewGame(clearMessage: Boolean = false) {
        answer = answerList.random(random)
        _state.value = _state.value.copy(
            guesses = emptyList(),
            status = GameStatus.IN_PROGRESS,
            currentInput = "",
            message = if (clearMessage) null else "New game started."
        )
    }

    private fun scoreGuess(answer: String, guess: String): List<LetterState> {
        val verdicts = MutableList(WORD_LENGTH) { LetterState.ABSENT }
        val remaining = answer.groupingBy { it }.eachCount().toMutableMap()

        answer.forEachIndexed { index, c ->
            if (guess[index] == c) {
                verdicts[index] = LetterState.CORRECT
                remaining[c] = (remaining[c] ?: 0) - 1
            }
        }

        guess.forEachIndexed { index, c ->
            if (verdicts[index] == LetterState.CORRECT) return@forEachIndexed
            val count = remaining[c] ?: 0
            if (count > 0) {
                verdicts[index] = LetterState.PRESENT
                remaining[c] = count - 1
            }
        }
        return verdicts
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                val viewModel: GameViewModel = viewModel()
                val state by viewModel.state.collectAsState()
                val history by viewModel.historyFlow.collectAsState(initial = emptyList())
                val navState = rememberNavState()
                AppScaffold(
                    navState = navState,
                    gameContent = {
                        WordleScreen(
                            state = state,
                            onInputChange = viewModel::onInputChanged,
                            onSubmitGuess = viewModel::submitGuess,
                            onNewGame = { viewModel.startNewGame(clearMessage = true) },
                            onKeyPress = viewModel::onKeyInput,
                            onDelete = viewModel::onDeleteInput,
                            onBack = { navState.value = Route.HOME }
                        )
                    },
                    historyContent = {
                        HistoryScreen(entries = history)
                    },
                    statsContent = {
                        StatsScreen(entries = history, onBack = { navState.value = Route.HOME })
                    }
                )
            }
        }
    }
}

enum class Route { HOME, GAME, HISTORY, STATS }

data class NavState(val route: Route = Route.HOME)

@Composable
fun rememberNavState(): MutableStateFlow<Route> = remember { MutableStateFlow(Route.HOME) }

@Composable
fun AppScaffold(
    navState: MutableStateFlow<Route>,
    gameContent: @Composable () -> Unit,
    historyContent: @Composable () -> Unit,
    statsContent: @Composable () -> Unit
) {
    val route by navState.collectAsState()
    when (route) {
        Route.HOME -> HomeScreen(
            onPlay = { navState.value = Route.GAME },
            onHistory = { navState.value = Route.HISTORY },
            onStats = { navState.value = Route.STATS }
        )
        Route.GAME -> gameContent()
        Route.HISTORY -> HistoryScreenWrapper(
            historyContent = historyContent,
            onBack = { navState.value = Route.HOME }
        )
        Route.STATS -> StatsScreenWrapper(
            statsContent = statsContent,
            onBack = { navState.value = Route.HOME }
        )
    }
}

@Composable
fun HomeScreen(onPlay: () -> Unit, onHistory: () -> Unit, onStats: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "My Wordle",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            textAlign = TextAlign.Center
        )
        Text(
            text = "Offline Wordle with history",
            style = MaterialTheme.typography.bodyMedium,
            color = Color.LightGray,
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp)
        )
        Button(
            onClick = onPlay,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp)
        ) {
            Text("Play")
        }
        Button(
            onClick = onHistory,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF38BDF8))
        ) {
            Text("History", color = Color(0xFF0F172A))
        }
        Button(
            onClick = onStats,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1F2937))
        ) {
            Text("Statistics", color = Color.White)
        }
    }
}

@Composable
fun HistoryScreenWrapper(historyContent: @Composable () -> Unit, onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(16.dp)
    ) {
        Text(
            text = "History",
            style = MaterialTheme.typography.titleLarge,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Box(modifier = Modifier.weight(1f)) {
            historyContent()
        }
        Button(
            onClick = onBack,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1F2937))
        ) {
            Text("Back", color = Color.White)
        }
    }
}

@Composable
fun StatsScreenWrapper(statsContent: @Composable () -> Unit, onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(16.dp)
    ) {
        Text(
            text = "Statistics",
            style = MaterialTheme.typography.titleLarge,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Box(modifier = Modifier.weight(1f)) {
            statsContent()
        }
        Button(
            onClick = onBack,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1F2937))
        ) {
            Text("Back", color = Color.White)
        }
    }
}

@Composable
fun HistoryScreen(entries: List<GameHistoryEntry>) {
    val formatter = DateTimeFormatter.ISO_LOCAL_DATE
    val today = remember { LocalDate.now() }
    val displayedMonthState = remember { mutableStateOf(YearMonth.from(today)) }
    val selectedDateState = remember { mutableStateOf(today) }
    val expandedEntryId = remember { mutableStateOf<Long?>(null) }
    val entriesByDate = remember(entries) {
        entries.groupBy { LocalDate.parse(it.dateString, formatter) }
    }
    val selectedEntries = entriesByDate[selectedDateState.value].orEmpty()
    val currentMonth = displayedMonthState.value
    val firstDayOfMonth = currentMonth.atDay(1)
    val daysInMonth = currentMonth.lengthOfMonth()
    val leadingBlanks = (firstDayOfMonth.dayOfWeek.value % 7)
    val days = (1..daysInMonth).map { day -> currentMonth.atDay(day) }
    val gridItems: List<LocalDate?> = List(leadingBlanks) { null } + days

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "‹",
                color = Color.White,
                modifier = Modifier
                    .clickable {
                        displayedMonthState.value = displayedMonthState.value.minusMonths(1)
                        selectedDateState.value = displayedMonthState.value.atDay(1)
                    }
                    .padding(8.dp),
                fontSize = 20.sp
            )
            Text(
                text = currentMonth.month.name.lowercase()
                    .replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() } + " ${currentMonth.year}",
                color = Color.White,
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = "›",
                color = Color.White,
                modifier = Modifier
                    .clickable {
                        displayedMonthState.value = displayedMonthState.value.plusMonths(1)
                        selectedDateState.value = displayedMonthState.value.atDay(1)
                    }
                    .padding(8.dp),
                fontSize = 20.sp
            )
        }
        LazyVerticalGrid(
            columns = GridCells.Fixed(7),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(4.dp)
        ) {
            items(gridItems) { date ->
                if (date == null) {
                    Box(modifier = Modifier.size(36.dp))
                } else {
                    val hasGames = entriesByDate.containsKey(date)
                    val isSelected = date == selectedDateState.value
                    val bg = when {
                        isSelected -> Color(0xFF38BDF8)
                        hasGames -> CorrectColor
                        else -> Color(0xFF1F2937)
                    }
                    val textColor = if (hasGames || isSelected) Color(0xFF0F172A) else Color.White
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(bg, shape = RoundedCornerShape(6.dp))
                            .clickable { selectedDateState.value = date },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = date.dayOfMonth.toString(), color = textColor, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Text(
            text = "Games on ${selectedDateState.value.format(formatter)}",
            color = Color.White,
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        if (selectedEntries.isEmpty()) {
            Text(text = "No games played.", color = Color.LightGray)
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 4.dp)
            ) {
                items(selectedEntries) { entry ->
                    HistoryCardCompact(
                        entry = entry,
                        expanded = expandedEntryId.value == entry.timestamp,
                        onToggle = {
                            expandedEntryId.value = if (expandedEntryId.value == entry.timestamp) null else entry.timestamp
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun HistoryCard(entry: GameHistoryEntry) {
    HistoryCardCompact(entry = entry, expanded = true, onToggle = {})
}

@Composable
fun HistoryCardCompact(entry: GameHistoryEntry, expanded: Boolean, onToggle: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF0F172A), shape = RoundedCornerShape(10.dp))
            .clickable { onToggle() }
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = entry.answer.uppercase(),
                color = Color.White,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = if (entry.won) "Won" else "Lost",
                color = if (entry.won) CorrectColor else Color(0xFFEF4444),
                fontWeight = FontWeight.SemiBold
            )
        }
        if (expanded) {
            Row(
                modifier = Modifier.padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                entry.guesses.forEach { guess ->
                    Text(
                        text = guess.uppercase(),
                        color = Color.White,
                        modifier = Modifier
                            .background(Color(0xFF1F2937), shape = RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun StatsScreen(entries: List<GameHistoryEntry>, onBack: () -> Unit) {
    if (entries.isEmpty()) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(text = "No games yet.", color = Color.LightGray)
        }
        return
    }
    val total = entries.size
    val wins = entries.count { it.won }
    val winRate = (wins.toFloat() / total * 100).coerceIn(0f, 100f)
    val histogram = (1..MAX_GUESSES).associateWith { guessCount ->
        entries.count { it.guesses.size == guessCount }
    }
    val maxCount = histogram.values.maxOrNull()?.coerceAtLeast(1) ?: 1
    val minCount = histogram.values.minOrNull() ?: 0
    val minMaxSame = maxCount == minCount

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = "Games Played", color = Color.White, fontWeight = FontWeight.Bold)
                Text(text = total.toString(), color = Color.White, fontWeight = FontWeight.SemiBold)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = "Win Percentage", color = Color.White, fontWeight = FontWeight.Bold)
                Text(text = String.format("%.1f%%", winRate), color = Color.White, fontWeight = FontWeight.SemiBold)
            }
        }

        Text(
            text = "Guess Distribution",
            color = Color.White,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
        Text(
            text = "Number of games by guess count",
            color = Color.LightGray,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )

        val minColor = Color(0xFF0B4C2D)
        val maxColor = Color(0xFFA7F3D0)
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            histogram.forEach { (guesses, count) ->
                val factor = if (minMaxSame) 1f else (count - minCount).toFloat() / (maxCount - minCount)
                val barColor = lerp(minColor, maxColor, factor.coerceIn(0f, 1f))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(28.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = guesses.toString(), color = Color.White, fontWeight = FontWeight.Bold)
                    val barFraction = (count.toFloat() / maxCount).coerceIn(0.05f, 1f)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(barFraction)
                            .fillMaxHeight()
                            .background(barColor, shape = RoundedCornerShape(6.dp)),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        Text(
                            text = count.toString(),
                            color = if (factor > 0.5f) Color(0xFF0F172A) else Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(start = 6.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun WordleScreen(
    state: GameUiState,
    onInputChange: (String) -> Unit,
    onSubmitGuess: () -> Unit,
    onNewGame: () -> Unit,
    onKeyPress: (Char) -> Unit,
    onDelete: () -> Unit,
    onBack: () -> Unit
) {
    if (state.isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
        return
    }

    val message = state.message.orEmpty()
    val letterStates = computeLetterStates(state.guesses)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "My Wordle",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            textAlign = TextAlign.Center
        )
        if (message.isNotBlank()) {
            Text(
                text = message,
                color = if (state.status == GameStatus.LOST) Color(0xFFEF4444) else Color(0xFF38BDF8),
                style = MaterialTheme.typography.bodyMedium
            )
        }

        Board(
            guesses = state.guesses,
            maxRows = state.maxGuesses,
            currentInput = state.currentInput
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = onSubmitGuess) {
                Text("Submit")
            }
            Button(
                onClick = onNewGame,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF38BDF8))
            ) {
                Text("New Game", color = Color(0xFF0F172A))
            }
        }

        Keyboard(
            letterStates = letterStates,
            onLetter = onKeyPress,
            onDelete = onDelete,
            onEnter = onSubmitGuess
        )
        Spacer(modifier = Modifier.weight(1f, fill = true))
        Button(
            onClick = onBack,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1F2937))
        ) {
            Text("Back", color = Color.White)
        }
    }
}

@Composable
fun Board(guesses: List<Guess>, maxRows: Int, currentInput: String) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(maxRows) { rowIndex ->
            val guess = guesses.getOrNull(rowIndex)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(WORD_LENGTH) { col ->
                    val letter = when {
                        guess != null -> guess.word.getOrNull(col)?.uppercase() ?: ""
                        rowIndex == guesses.size -> currentInput.getOrNull(col)?.uppercase() ?: ""
                        else -> ""
                    }
                    val state = guess?.results?.getOrNull(col) ?: LetterState.UNUSED
                    Tile(letter = letter, state = state)
                }
            }
        }
    }
}

@Composable
fun Tile(letter: String, state: LetterState) {
    val colors = when (state) {
        LetterState.CORRECT -> CorrectColor
        LetterState.PRESENT -> PresentColor
        LetterState.ABSENT -> AbsentColor
        LetterState.UNUSED -> UnusedColor
    }
    Box(
        modifier = Modifier
            .size(54.dp)
            .background(color = colors, shape = RoundedCornerShape(8.dp)),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = letter,
            color = if (state == LetterState.UNUSED || state == LetterState.ABSENT) Color.White else Color(0xFF0F172A),
            fontWeight = FontWeight.ExtraBold,
            fontSize = 20.sp,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun Keyboard(
    letterStates: Map<Char, LetterState>,
    onLetter: (Char) -> Unit,
    onDelete: () -> Unit,
    onEnter: () -> Unit
) {
    val rows = listOf("QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM")
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(text = "Keyboard", style = MaterialTheme.typography.titleMedium, color = Color.White)
        rows.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically
            ) {
                row.forEach { letter ->
                    val state = letterStates[letter.lowercaseChar()] ?: LetterState.UNUSED
                    Key(
                        label = letter.toString(),
                        state = state,
                        onClick = { onLetter(letter.lowercaseChar()) }
                    )
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Key(label = "ENTER", state = LetterState.UNUSED, onClick = { onEnter() }, isWide = true)
            Key(label = "⌫", state = LetterState.UNUSED, onClick = { onDelete() }, isWide = true)
        }
    }
}

@Composable
fun Key(label: String, state: LetterState, onClick: (() -> Unit)? = null, isWide: Boolean = false) {
    val bg = when (state) {
        LetterState.CORRECT -> CorrectColor
        LetterState.PRESENT -> PresentColor
        LetterState.ABSENT -> AbsentColor
        LetterState.UNUSED -> Color(0xFFFFFFFF)
    }
    val textColor = when (state) {
        LetterState.UNUSED -> Color(0xFF0F172A)
        LetterState.ABSENT -> Color(0xFFE5E7EB)
        else -> Color(0xFF0F172A)
    }
    val width = if (isWide) 56.dp else 28.dp
    Box(
        modifier = Modifier
            .width(width)
            .height(40.dp)
            .background(color = bg, shape = RoundedCornerShape(6.dp))
            .clickable(enabled = onClick != null) { onClick?.invoke() },
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = textColor,
            fontWeight = FontWeight.Bold
        )
    }
}

private fun computeLetterStates(guesses: List<Guess>): Map<Char, LetterState> {
    val priority = mapOf(
        LetterState.UNUSED to 0,
        LetterState.ABSENT to 1,
        LetterState.PRESENT to 2,
        LetterState.CORRECT to 3
    )
    val result = mutableMapOf<Char, LetterState>()
    guesses.forEach { guess ->
        guess.word.forEachIndexed { index, c ->
            val state = guess.results.getOrNull(index) ?: LetterState.UNUSED
            val current = result[c] ?: LetterState.UNUSED
            if ((priority[state] ?: 0) > (priority[current] ?: 0)) {
                result[c] = state
            }
        }
    }
    return result
}
