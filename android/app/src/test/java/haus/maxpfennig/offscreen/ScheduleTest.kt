package haus.maxpfennig.offscreen

import org.junit.Assert.*
import org.junit.Test

class ScheduleTest {
    private val first=Film("a","A","1940","a.opus",listOf(0L to 20_000L))
    private val second=Film("b","B","1941","b.opus",listOf(10_000L to 30_000L))
    private val schedule=Schedule(1_000_000L,listOf(Station("test","Test",listOf(first,second))))
    @Test fun overlapChangesScheduleWithoutTruncatingSource() {
        assertEquals(20_000L,first.duration);assertEquals(17_000L,first.slot)
        assertEquals("a",schedule.at(0,1_016_999).film.slug)
        val next=schedule.at(0,1_017_000);assertEquals("b",next.film.slug);assertEquals(10_000L,next.position)
        assertEquals("a",schedule.at(0,1_034_000).film.slug)
        assertEquals(16_999L,schedule.at(0,999_999).offset)
    }
    @Test fun retainedSegmentsMapToSourceTime() {
        val film=first.copy(segments=listOf(10_000L to 20_000L,30_000L to 50_000L))
        assertEquals(10_000L,film.sourcePosition(0));assertEquals(30_000L,film.sourcePosition(10_000));assertEquals(49_999L,film.sourcePosition(29_999))
    }
    @Test fun sleepFadesOverFinalTenSecondsAndFreezesWhenOff() {
        val timer=SleepTimer();timer.set(1,true,1_000)
        assertEquals(1f,timer.gain(51_000),.001f);assertEquals(.5f,timer.gain(56_000),.001f)
        timer.pause(56_000);assertEquals(5_000L,timer.left(100_000));assertFalse(timer.expired(100_000))
        timer.resume(100_000);assertEquals(.5f,timer.gain(100_000),.001f);assertTrue(timer.expired(105_000));assertEquals(0f,timer.gain(105_000),.001f)
        timer.clear();assertEquals(0L,timer.left(110_000));assertEquals(1f,timer.gain(110_000),.001f)
    }
    @Test fun changingAndCancellingSleepReplacesDeadline() {
        val timer=SleepTimer();timer.set(1,true,0);timer.set(2,true,55_000)
        assertEquals(120_000L,timer.left(55_000));assertEquals(1f,timer.gain(55_000),.001f)
        timer.set(0,true,56_000);assertFalse(timer.expired(500_000));assertEquals(1f,timer.gain(500_000),.001f)
    }
}
