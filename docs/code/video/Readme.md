<a name="Video"></a>

## Video
class representing video features

**Kind**: global class  

* [Video](#Video)
    * [.restoreState()](#Video+restoreState)
    * [.beginScrubbing()](#Video+beginScrubbing)
    * [.moveScrubbing(evt)](#Video+moveScrubbing)
    * [.endScrubbing()](#Video+endScrubbing)
    * [.clickScrub(evt)](#Video+clickScrub)
    * [.closestFramerate(framerate)](#Video+closestFramerate)
    * [.updateTimecodes(startFrame, endFrame, framerate)](#Video+updateTimecodes)
    * [.file(filePath, string)](#Video+file)
    * [.previewFile(filePath, sound)](#Video+previewFile)
    * [.onloadstart()](#Video+onloadstart)

<a name="Video+restoreState"></a>

### video.restoreState()
Restore the apps saved state to the video UI

**Kind**: instance method of [<code>Video</code>](#Video)  
<a name="Video+beginScrubbing"></a>

### video.beginScrubbing()
Set the scrubbing state boolean to true

**Kind**: instance method of [<code>Video</code>](#Video)  
<a name="Video+moveScrubbing"></a>

### video.moveScrubbing(evt)
Invoked on mousemove event when scrubbing video

**Kind**: instance method of [<code>Video</code>](#Video)  

| Param | Type | Description |
| --- | --- | --- |
| evt | <code>object</code> | MouseEvent of the mouse moving |

<a name="Video+endScrubbing"></a>

### video.endScrubbing()
Invoked on mouseup while scrubbing video

**Kind**: instance method of [<code>Video</code>](#Video)  
<a name="Video+clickScrub"></a>

### video.clickScrub(evt)
Invocked when mouse clicks on timeline, scrubs video to point

**Kind**: instance method of [<code>Video</code>](#Video)  

| Param | Type | Description |
| --- | --- | --- |
| evt | <code>object</code> | Click event |

<a name="Video+closestFramerate"></a>

### video.closestFramerate(framerate)
Find the closest framerate to a set of values in the class

**Kind**: instance method of [<code>Video</code>](#Video)  

| Param | Type | Description |
| --- | --- | --- |
| framerate | <code>number</code> | Framerate to match to preset values |

<a name="Video+updateTimecodes"></a>

### video.updateTimecodes(startFrame, endFrame, framerate)
Display the start and end timecode in the two inputs on top of the screen

**Kind**: instance method of [<code>Video</code>](#Video)  

| Param | Type | Description |
| --- | --- | --- |
| startFrame | <code>number</code> | Starting frame (usually 0) |
| endFrame | <code>number</code> | Ending frame number |
| framerate | <code>number</code> | Video framerate in FPS |

<a name="Video+file"></a>

### video.file(filePath, string)
Called when a file is loaded to be added as a video
or image as necessary.

**Kind**: instance method of [<code>Video</code>](#Video)  

| Param | Type | Description |
| --- | --- | --- |
| filePath | <code>string</code> | Path to video file |
| string | <code>type</code> | Type of file loaded (video/still) |

<a name="Video+previewFile"></a>

### video.previewFile(filePath, sound)
Invoked when preview video is used to supplant a video file
that isn't readable in an HTML video element.

**Kind**: instance method of [<code>Video</code>](#Video)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| filePath | <code>string</code> |  | Path to video file |
| sound | <code>boolean</code> | <code>false</code> | Whether video has sound |

<a name="Video+onloadstart"></a>

### video.onloadstart()
Called when a still is loaded

**Kind**: instance method of [<code>Video</code>](#Video)  
