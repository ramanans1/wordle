package com.example.wordle.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val Context.dataStore by preferencesDataStore(name = "history")

@Serializable
data class GameHistoryEntry(
    val timestamp: Long,
    val answer: String,
    val won: Boolean,
    val guesses: List<String>
) {
    val dateString: String
        get() = Instant.ofEpochMilli(timestamp)
            .atZone(ZoneId.systemDefault())
            .toLocalDate()
            .format(DateTimeFormatter.ISO_LOCAL_DATE)
}

class HistoryRepository(private val context: Context) {
    private val key = stringPreferencesKey("entries_json")
    private val json = Json { ignoreUnknownKeys = true }

    fun historyFlow(): Flow<List<GameHistoryEntry>> {
        return context.dataStore.data.map { prefs ->
            val raw = prefs[key] ?: return@map emptyList()
            runCatching { json.decodeFromString<List<GameHistoryEntry>>(raw) }
                .getOrDefault(emptyList())
                .sortedByDescending { it.timestamp }
        }
    }

    suspend fun addEntry(entry: GameHistoryEntry) {
        context.dataStore.edit { prefs ->
            val existing = prefs[key]?.let {
                runCatching { json.decodeFromString<List<GameHistoryEntry>>(it) }.getOrDefault(emptyList())
            } ?: emptyList()
            val updated = listOf(entry) + existing
            prefs[key] = json.encodeToString(updated)
        }
    }
}
