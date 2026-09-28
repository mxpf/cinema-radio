package haus.maxpfennig.offscreen

import android.content.ComponentName
import android.os.Bundle
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.UiDevice
import androidx.media3.session.*
import com.google.common.util.concurrent.ListenableFuture
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class PlaybackTest {
    @Test fun nativePlaybackSurvivesBackgroundAndSleepStopsIt() {
        val instrumentation=InstrumentationRegistry.getInstrumentation()
        val context=instrumentation.targetContext
        val scenario=ActivityScenario.launch(MainActivity::class.java)
        var pending: ListenableFuture<MediaController>?=null
        instrumentation.runOnMainSync {
            pending=MediaController.Builder(context,SessionToken(context,ComponentName(context,RadioService::class.java))).buildAsync()
        }
        val controller=pending!!.get(20,TimeUnit.SECONDS)
        fun command(action: String,value: Any?=null): JSONObject {
            val message=JSONObject().put("action",action);if(value!=null)message.put("value",value)
            var result: ListenableFuture<SessionResult>?=null
            instrumentation.runOnMainSync { result=controller.sendCustomCommand(SessionCommand(RadioService.COMMAND,Bundle.EMPTY),Bundle().apply{putString("message",message.toString())}) }
            return JSONObject(result!!.get(10,TimeUnit.SECONDS).extras.getString("state")!!)
        }
        fun waitForPlaying() {
            val until=System.currentTimeMillis()+30_000
            while(System.currentTimeMillis()<until) { if(command("state").getBoolean("playing"))return;Thread.sleep(500) }
            fail("Native audio did not start: ${command("state")}")
        }
        try {
            Thread.sleep(2500)
            command("power",true);waitForPlaying()
            command("volume",.2)
            assertEquals(.2,command("state").getDouble("volume"),.001)
            UiDevice.getInstance(instrumentation).takeScreenshot(java.io.File(context.getExternalFilesDir(null),"radio.png"))
            UiDevice.getInstance(instrumentation).pressHome();Thread.sleep(3000)
            assertTrue("Playback must continue off screen",command("state").getBoolean("playing"))
            instrumentation.runOnMainSync { controller.pause() };Thread.sleep(700)
            assertFalse(command("state").getBoolean("powered"))
            instrumentation.runOnMainSync { controller.play() };waitForPlaying()
            val old=command("state").getInt("station")
            command("station",if(old==0)1 else 0);waitForPlaying()
            command("sleep",1)
            Thread.sleep(56_000)
            val tail=command("state")
            assertTrue(tail.getDouble("sleepSeconds") in 0.0..5.0)
            Thread.sleep(5500)
            val off=command("state");assertFalse(off.getBoolean("powered"));assertFalse(off.getBoolean("playing"))
        } finally {
            command("power",false)
            instrumentation.runOnMainSync { controller.release() }
            scenario.close()
        }
    }
}
