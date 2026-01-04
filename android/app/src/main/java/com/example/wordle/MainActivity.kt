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
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
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

    private val _state = MutableStateFlow(GameUiState())
    val state: StateFlow<GameUiState> = _state

    private var answer: String = ""
    private var wordList: List<String> = fallbackWords
    private var wordSet: Set<String> = fallbackWords.toSet()
    private val random = Random(System.currentTimeMillis())

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
                if (word.length == WORD_LENGTH && word.all { it.isLetter() }) {
                    words.add(word)
                }
            }
        }
        return words.ifEmpty { fallbackWords }
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
    }

    fun startNewGame(clearMessage: Boolean = false) {
        answer = wordList.random(random)
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
                WordleScreen(
                    state = state,
                    onInputChange = viewModel::onInputChanged,
                    onSubmitGuess = viewModel::submitGuess,
                    onNewGame = { viewModel.startNewGame(clearMessage = true) },
                    onKeyPress = viewModel::onKeyInput,
                    onDelete = viewModel::onDeleteInput
                )
            }
        }
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun WordleScreen(
    state: GameUiState,
    onInputChange: (String) -> Unit,
    onSubmitGuess: () -> Unit,
    onNewGame: () -> Unit,
    onKeyPress: (Char) -> Unit,
    onDelete: () -> Unit
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
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "Wordle (Offline)",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        if (message.isNotBlank()) {
            Text(
                text = message,
                color = if (state.status == GameStatus.LOST) Color(0xFFEF4444) else Color(0xFF38BDF8),
                style = MaterialTheme.typography.bodyMedium
            )
        }

        Board(guesses = state.guesses, maxRows = state.maxGuesses)

        Column(
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = state.currentInput.uppercase(),
                onValueChange = onInputChange,
                label = { Text("Enter guess") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color(0xFF0F172A),
                    unfocusedContainerColor = Color(0xFF0F172A),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    cursorColor = Color.White,
                    focusedLabelColor = Color(0xFF38BDF8),
                    unfocusedLabelColor = Color(0xFF9CA3AF)
                )
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onSubmitGuess, modifier = Modifier.weight(1f)) {
                    Text("Submit")
                }
                Button(
                    onClick = onNewGame,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF38BDF8)),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("New Game", color = Color(0xFF0F172A))
                }
            }
        }

        Keyboard(
            letterStates = letterStates,
            onLetter = onKeyPress,
            onDelete = onDelete,
            onEnter = onSubmitGuess
        )
    }
}

@Composable
fun Board(guesses: List<Guess>, maxRows: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(maxRows) { rowIndex ->
            val guess = guesses.getOrNull(rowIndex)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(WORD_LENGTH) { col ->
                    val letter = guess?.word?.getOrNull(col)?.uppercase() ?: ""
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
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
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
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
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
