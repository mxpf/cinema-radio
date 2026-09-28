package haus.maxpfennig.radio

import org.json.JSONObject
import kotlin.math.min

internal const val CROSSFADE_MS = 3_000L
internal const val SLEEP_FADE_MS = 10_000L
internal const val MEDIA_BASE = "https://cinema-radio-media.maxpfennighaus.workers.dev/"

internal data class Film(val slug: String, val title: String, val year: String, val file: String, val segments: List<Pair<Long, Long>>) {
    val duration = segments.sumOf { it.second - it.first }
    val slot = duration - min(CROSSFADE_MS, duration / 2)
    fun sourcePosition(offset: Long): Long {
        var remaining = offset.coerceAtLeast(0)
        for ((start, end) in segments) {
            if (remaining < end - start) return start + remaining
            remaining -= end - start
        }
        return segments.last().second
    }
}
internal data class Station(val id: String, val name: String, val films: List<Film>) {
    val duration = films.sumOf { it.slot }
}
internal data class Programme(val film: Film, val offset: Long, val index: Int) {
    val position get() = film.sourcePosition(offset)
}
internal class Schedule(val epoch: Long, val stations: List<Station>) {
    fun at(station: Int, now: Long): Programme {
        val channel = stations[station]
        var offset = Math.floorMod(now - epoch, channel.duration)
        channel.films.forEachIndexed { i, film ->
            if (offset < film.slot) return Programme(film, offset, i)
            offset -= film.slot
        }
        error("Empty schedule")
    }
    companion object {
        fun parse(programme: String, stations: String): Schedule {
            val data = JSONObject(programme)
            val films = data.getJSONArray("tracks")
            val bySlug = (0 until films.length()).associate { i ->
                val f = films.getJSONObject(i)
                val duration = (f.getDouble("duration") * 1000).toLong()
                val skips = f.optJSONArray("skip")
                val intervals = (0 until (skips?.length() ?: 0)).map { j ->
                    val pair = skips!!.getJSONArray(j)
                    val a = (pair.getDouble(0) * 1000).toLong()
                    val b = (pair.getDouble(1) * 1000).toLong()
                    require(a >= 0 && b > a && b <= duration)
                    a to b
                }.sortedBy { it.first }
                val segments = mutableListOf<Pair<Long, Long>>()
                var cursor = 0L
                for ((a,b) in intervals) { if (a > cursor) segments += cursor to a; cursor = maxOf(cursor,b) }
                if (cursor < duration) segments += cursor to duration
                require(segments.isNotEmpty())
                val file = f.getString("file")
                require(Regex("[a-zA-Z0-9._-]+\\.opus").matches(file))
                val film = Film(f.getString("slug"), f.getString("title"), f.getString("year"), file, segments)
                film.slug to film
            }
            val channels = JSONObject(stations).getJSONArray("stations")
            return Schedule(java.time.Instant.parse(data.getString("epoch_utc")).toEpochMilli(), (0 until channels.length()).map { i ->
                val s = channels.getJSONObject(i); val names = s.getJSONArray("tracks")
                require(names.length() > 0)
                Station(s.getString("id"), s.getString("name"), (0 until names.length()).map { bySlug.getValue(names.getString(it)) })
            }.also { require(it.isNotEmpty()) })
        }
    }
}

/** Monotonic timer: device clock changes cannot extend or shorten sleep. */
internal class SleepTimer {
    var remaining = 0L; private set
    private var deadline = 0L
    fun set(minutes: Int, playing: Boolean, now: Long) {
        remaining = minutes.coerceIn(0,60) * 60_000L
        deadline = if (playing && remaining > 0) now + remaining else 0
    }
    fun resume(now: Long) { if (remaining > 0) deadline = now + remaining }
    fun pause(now: Long) { remaining = left(now); deadline = 0 }
    fun left(now: Long) = if (deadline > 0) (deadline - now).coerceAtLeast(0) else remaining
    fun expired(now: Long) = deadline > 0 && now >= deadline
    fun gain(now: Long) = if (deadline == 0L) 1f else (left(now).toFloat() / SLEEP_FADE_MS).coerceIn(0f,1f)
    fun clear() { remaining = 0; deadline = 0 }
}
