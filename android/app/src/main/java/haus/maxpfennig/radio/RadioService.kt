@file:OptIn(androidx.media3.common.util.UnstableApi::class)
package haus.maxpfennig.radio

import android.app.PendingIntent
import android.content.Intent
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.media3.common.*
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.*
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import org.json.JSONObject

class RadioService : MediaSessionService() {
    private lateinit var schedule: Schedule
    private lateinit var session: MediaSession
    private lateinit var decks: List<ExoPlayer>
    private val handler = Handler(Looper.getMainLooper())
    private val sleep = SleepTimer()
    private val prefs by lazy { getSharedPreferences("radio", MODE_PRIVATE) }
    private val audioManager by lazy { getSystemService(AudioManager::class.java) }
    private lateinit var focus: AudioFocusRequest
    private var active = 0
    private val slugs = arrayOf("", "")
    private var station = 0
    private var powered = false
    private var volume = .65f
    private var duck = 1f
    private var error = ""
    private var pending: Programme? = null
    private var fadeStart = 0L
    private var fadeLength = CROSSFADE_MS
    private var fading = false
    private var powerStart = 0L
    private var powerFrom = 0f
    private var powerTo = 0f
    private var powerGain = 0f
    private var retryAt = 0L
    private var resumeAfterFocus = false
    private val ticker = object : Runnable {
        override fun run() { tick(); handler.postDelayed(this, if (powered || powerGain > 0) 40 else 1000) }
    }
    override fun onCreate() {
        super.onCreate()
        schedule = Schedule.parse(assets.open("programme.json").bufferedReader().use { it.readText() }, assets.open("stations.json").bufferedReader().use { it.readText() })
        station = schedule.stations.indexOfFirst { it.id == prefs.getString("station", "repertory") }.coerceAtLeast(0)
        volume = prefs.getFloat("volume", .65f).coerceIn(0f, 1f)
        focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_MEDIA).setContentType(android.media.AudioAttributes.CONTENT_TYPE_MOVIE).build())
            .setOnAudioFocusChangeListener({ change ->
                when (change) {
                    AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> duck = .2f
                    AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> { resumeAfterFocus = powered; power(false, abandonFocus = false) }
                    AudioManager.AUDIOFOCUS_LOSS -> { resumeAfterFocus = false; power(false) }
                    AudioManager.AUDIOFOCUS_GAIN -> { duck = 1f; if (resumeAfterFocus) { resumeAfterFocus = false; power(true) } }
                }
            }, handler).build()
        decks = List(2) { index ->
            ExoPlayer.Builder(this).build().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), false)
                setHandleAudioBecomingNoisy(true)
                setWakeMode(C.WAKE_MODE_NETWORK)
                addListener(object : Player.Listener {
                    override fun onPlayerError(e: PlaybackException) {
                        if (index == active || pending != null && index != active) {
                            error = "Audio unavailable. Check your connection and try again."
                            power(false)
                        } else slugs[index] = ""
                    }
                    override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) {
                        if (!playWhenReady && reason == Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_BECOMING_NOISY) power(false)
                    }
                })
            }
        }
        val intent = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        session = MediaSession.Builder(this, controlledPlayer())
            .setSessionActivity(intent)
            .setCallback(object : MediaSession.Callback {
                override fun onConnect(s: MediaSession, controller: MediaSession.ControllerInfo): MediaSession.ConnectionResult {
                    val result = super.onConnect(s, controller)
                    val commands = result.availableSessionCommands.buildUpon()
                    if (controller.uid == android.os.Process.myUid()) commands.add(SessionCommand(COMMAND, Bundle.EMPTY))
                    return MediaSession.ConnectionResult.AcceptedResultBuilder(s).setAvailableSessionCommands(commands.build()).build()
                }
                override fun onCustomCommand(s: MediaSession, controller: MediaSession.ControllerInfo, command: SessionCommand, args: Bundle): ListenableFuture<SessionResult> {
                    if (controller.uid != android.os.Process.myUid() || command.customAction != COMMAND) return Futures.immediateFuture(SessionResult(SessionResult.RESULT_ERROR_PERMISSION_DENIED))
                    handle(args.getString("message") ?: "{}")
                    return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS, Bundle().apply { putString("state", state().toString()) }))
                }
            }).build()
        handler.post(ticker)
    }
    private fun controlledPlayer(): Player = object : ForwardingPlayer(decks[active]) {
        override fun play() = power(true)
        override fun pause() { resumeAfterFocus = false; power(false) }
        override fun setPlayWhenReady(value: Boolean) = if (value) play() else pause()
        override fun stop() = pause()
        override fun getAvailableCommands(): Player.Commands = Player.Commands.Builder()
            .addAll(Player.COMMAND_PLAY_PAUSE, Player.COMMAND_STOP, Player.COMMAND_GET_CURRENT_MEDIA_ITEM, Player.COMMAND_GET_TIMELINE, Player.COMMAND_GET_METADATA).build()
        override fun isCommandAvailable(command: Int) = availableCommands.contains(command)
    }
    private fun handle(message: String) {
        runCatching {
            val msg = JSONObject(message)
            when (msg.getString("action")) {
                "power" -> { resumeAfterFocus = false; power(msg.getBoolean("value")) }
                "volume" -> { val value = msg.getDouble("value"); if (value.isFinite()) { volume = value.toFloat().coerceIn(0f,1f); prefs.edit().putFloat("volume",volume).apply() } }
                "sleep" -> sleep.set(msg.getInt("value"), powered, SystemClock.elapsedRealtime())
                "station" -> {
                    val next = msg.getInt("value").coerceIn(schedule.stations.indices)
                    if (next != station) {
                        station = next; prefs.edit().putString("station",schedule.stations[station].id).apply()
                        pending = null; fading = false; decks.forEach { it.pause() }; slugs.fill("")
                        powerGain = 0f; powerFrom = 0f; powerTo = if (powered) 1f else 0f; powerStart = SystemClock.elapsedRealtime()
                        if (powered) join(schedule.at(station,System.currentTimeMillis()), false)
                    }
                }
            }
        }.onFailure { error = "Could not apply that control. Please try again." }
    }
    private fun power(on: Boolean, abandonFocus: Boolean = true) {
        if (on == powered) return
        val now = SystemClock.elapsedRealtime()
        if (on && audioManager.requestAudioFocus(focus) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { error = "Audio is in use by another app. Try again."; return }
        powered = on; powerFrom = powerGain; powerTo = if (on) 1f else 0f; powerStart = now
        if (on) { error = ""; duck = 1f; sleep.resume(now); join(schedule.at(station,System.currentTimeMillis()), false) }
        else { sleep.pause(now); pending = null; if (abandonFocus) audioManager.abandonAudioFocusRequest(focus) }
    }
    private fun load(index: Int, p: Programme) {
        val player = decks[index]
        if (slugs[index] != p.film.slug) {
            player.setMediaItem(MediaItem.Builder().setMediaId(p.film.slug).setUri(MEDIA_BASE + p.film.file)
                .setMediaMetadata(MediaMetadata.Builder().setTitle(p.film.title).setArtist(schedule.stations[station].name).setIsPlayable(true).build()).build(), p.position)
            slugs[index] = p.film.slug; player.prepare()
        } else player.seekTo(p.position)
    }
    private fun join(p: Programme, overlap: Boolean) {
        if (!overlap) {
            pending = null; fading = false; decks[1-active].pause(); load(active,p); decks[active].volume = 0f; decks[active].play()
        } else if (pending?.film?.slug != p.film.slug) {
            pending = p; val next = 1-active; decks[next].volume=0f; load(next,p)
        }
    }
    private fun tick() {
        val now = SystemClock.elapsedRealtime()
        if (powered && sleep.expired(now)) { sleep.clear(); powerGain=0f; power(false) }
        // Do not spend the power-up fade while buffering.
        if (powered && decks[active].playbackState != Player.STATE_READY && pending == null) powerStart = now
        val progress = ((now-powerStart)/350f).coerceIn(0f,1f)
        powerGain = powerFrom + (powerTo-powerFrom)*progress*progress*(3-2*progress)
        if (!powered && powerGain == 0f) { decks.forEach { it.pause() }; fading=false; return }
        if (powered) {
            val p = schedule.at(station,System.currentTimeMillis())
            if (p.film.slug != slugs[active]) join(p,true)
            val requested = pending
            if (requested != null && decks[1-active].playbackState == Player.STATE_READY) {
                val live = schedule.at(station,System.currentTimeMillis())
                if (live.film.slug == requested.film.slug) {
                    val incoming = 1-active; decks[incoming].seekTo(live.position); decks[incoming].play()
                    fadeStart=now; fadeLength=(CROSSFADE_MS-live.offset).coerceAtLeast(350); fading=true
                    active=incoming; pending=null; session.setPlayer(controlledPlayer())
                } else pending=null
            }
            if (!fading && pending == null && decks[active].playbackState == Player.STATE_READY) {
                if (kotlin.math.abs(decks[active].currentPosition-p.position)>3000) decks[active].seekTo(p.position)
                if (!p.film.segments.any { decks[active].currentPosition in it.first until it.second && p.position in it.first until it.second }) decks[active].seekTo(p.position)
                if (p.film.slot-p.offset < 30_000) {
                    val channel=schedule.stations[station];val film=channel.films[(p.index+1)%channel.films.size]
                    if (slugs[1-active]!=film.slug) { decks[1-active].pause();decks[1-active].volume=0f;load(1-active,Programme(film,0,(p.index+1)%channel.films.size)) }
                }
            }
        }
        val mix = if (fading) ((now-fadeStart).toFloat()/fadeLength).coerceIn(0f,1f) else 1f
        val level = volume*powerGain*sleep.gain(now)*duck
        decks[active].volume=level*mix;decks[1-active].volume=level*(1-mix)
        if (fading && mix >= 1f) { decks[1-active].pause();fading=false }
    }
    private fun state(): JSONObject {
        val p=schedule.at(station,System.currentTimeMillis())
        return JSONObject().put("powered",powered).put("playing",powered && decks[active].isPlaying)
            .put("station",station).put("volume",volume).put("sleepSeconds",sleep.left(SystemClock.elapsedRealtime())/1000.0)
            .put("slug",p.film.slug).put("error",error)
    }
    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo) = session
    override fun onTaskRemoved(rootIntent: Intent?) { if (!powered) stopSelf() }
    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        session.release();decks.forEach { it.release() };audioManager.abandonAudioFocusRequest(focus)
        super.onDestroy()
    }
    companion object { const val COMMAND = "haus.maxpfennig.radio.CONTROL" }
}
