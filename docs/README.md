# SpiritsInObjects User Manual

I. [Introduction](#introduction)\
II. [Getting started](#getting_started)\
&nbsp;&nbsp;&nbsp;&nbsp;A. [Creating images and videos](#creating_images_and_videos)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;i. [Formats](#iv_formats)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ii. [Dimensions](#dimensions)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;iii. [Soundtrack location](#soundtrack_location)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;iv. [Color](#color)\
&nbsp;&nbsp;&nbsp;&nbsp;B. [Creating audio](#creating_audio)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;i. [Formats](#a_formats)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ii. [MIDI files](#midi_files)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;iii. [Audio files](#audio_files)\
&nbsp;&nbsp;&nbsp;&nbsp;C. [Other details](#other_details)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;i. [Film size and frame rate](#film_size_and_frame_rate)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ii. [Audio sample rate](#audio_sample_rate)\
III. [Using the application](#using_the_application)\
&nbsp;&nbsp;&nbsp;&nbsp;A. [Composer](#composer)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;i. [Adding images to the Bin](#adding_images_to_the_bin)\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
&nbsp;&nbsp;&nbsp;&nbsp;B. [Sonify](#sonify)\
&nbsp;&nbsp;&nbsp;&nbsp;C. [Visualize](#visualize)\

<a name="introduction"></a>

## I. Introduction

SpiritsInObjects is a software tool that provides a means for sonifying and sequencing a set of images, sonifying entire videos *and* visualizing MIDI or audio. 
It is meant to aid in the process of creating optical sound films by allowing a user to import a set of images, organize/sequence them onto a timeline in either repeating or unique patterns, listen to the sounds that they produce, and output results in three formats: 

1. Preview playback within the program
2. WAV files
3. MOV videos

This manual will guide you through the SpiritsInObjects program.

<a name="getting_started"></a>

## II. Getting started 

<a name="creating_images_and_videos"></a>

#### A. Creating images and videos

<a name="iv_formats"></a>

**i. Formats**

Videos that are supported by Chromium will be able to be used by the application with no additional rendering: [The Chromium Projects - Audio Video](https://www.chromium.org/audio-video)<sup>[1](#footnote1)</sup>
Videos with ProRes, H.265 or other non-supported encoding will need to be transcoded by the application to be previewed in the GUI.
All videos are processed with a provided `ffmpeg` binary and the application will support any codec allowed by the version in the module [ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static)<sup>[2](#footnote2)</sup>.

Image formats supported by the application are PNG, JPEG and non-animated GIF.
JPEG files are allowed with either the .jpeg or .jpg extension.

<a name="dimensions"></a>

**ii. Dimensions**

SpiritsInObjects will accept images and video of any dimensions, but for the purposes of making sound-on-film video, 16:9 is the ideal dimension ratio.
The resolution that will determine audio quality is the height of the image or video, with larger values allowing for higher sample rates.

When creating images for the Composer, note that the largest of any files you include in the Bin will be the resolution of the video you create.
Keep this in mind when adding images and unless you have a specific reason for doing otherwise, try to 

<a name="soundtrack_location"></a>

**iii. Soundtrack location** 

SpiritsInObjects attempts to recreate the sounds that are produced by the optical sound component within 16mm projectors. 
These sound devices work by reading light that passes through the soundtrack portion (the side without the sprocket-holes) of single perf 16mm film. 
SpiritsInObjects only analyzes the right 19% of each image. 
Any visual data to the left of this area is ignored and doesn't affect the sound in any way. 
Therefore, when creating images for use with this program, make sure to note that you will only be hearing the right 19% of each image. 

<a name="color"></a> 

**iv. Color**

SpiritsInObjects does not take color into consideration when analyzing images or videos. 
It only calculates the average, perceptual luminance within the soundtrack portion of the imported pictures. 

<a name="creating_audio"></a>

#### B. Creating audio

<a name="a_formats"></a>

**i. Formats**

SpiritsInObjects is capable of visualizing both MIDI and audio files in WAV or MP3 formats.

<a name="midi_files"></a>

**ii. MIDI files**

The MIDI visualization feature can generate videos per track, meaning that if your MIDI file contains several tracks or instruments they will have to be visualized separately.

<a name="audio_files"></a>

**iii. Audio files**

Audio files will be interpreted as mono, single-channel files no matter what is provided to the software.
Take this into consideration if you would like to mix down your tracks outside of the application prior to visualization.
The sample rate of the audio will be scaled to the maximum rate allowed by the height of the video resolution you wish to output.
For reference, if you are generating a 1080P resolution video (in the app labelled 1920x1080) your maximum sample rate will be 25920 Hz or just under 26 kHz.
Higher resolution video which allows for more visual data will allow for higher sample rate audio.

<a name="other_details"></a>

#### C. Other details

<a name="film_size_and_frame_rate"></a>

**i. Film size and frame rate** 

SpiritsInObjects assumes that your images will end up on 16mm film filmed with a Super16 gate and run through a 16mm projector at 24 frames per second.

<a name="audio_sample_rate"></a>

**ii. Audio sample rate** 

The audio in this application and the WAV file that it exports are played/recorded at a 48 kHz sampling rate. 

<a name="using_the_application"></a>
 
## III. Using the application 

<a name="compose"></a>

#### Composer

The Composer...

<a name="adding_images_to_the_bin"></a>

**i. Adding images to the Bin**

In order to use images within the Composer, they first must be added to the bin.
Image files can be added by dragging them into the application window or by clicking the "Import File" button below the Bin.

![SCREENSHOT OF BIN WITH IMAGE FILES IN IT]()

Once added, the images will be listed in the order they were added.
Each image file will have a "Key" associated to it, labelled in the left-hand column.
This is the key on the keyboard that can be pressed to play the sonification of an image.
Holding the key will play it continuously.

Clicking on an image will select it and display it in the composer video window.

<a name="creating_a_timeline"></a>

**ii. Creating a Timeline**

In order to create a sequence within the Composer, you must create a timeline of a specified length.
Click the "New Timeline" button on the right of the app and a prompt will appear asking for the length of the new Timeline, in frames.

![SCREENSHOT OF THE NEW TIMELINE PROMPT]()

The default value supplied is 255, which is roughly 10.6 seconds played back at 24 FPS.
Timelines that are 4000 frame long will fill exactly 100 feet or 30.48 meters of 16mm film.

<a name="adding_images_to_the_timeline"></a>

**iii. Adding images to the Timeline**

To sequence images on the Timeline you can drag them from the Bin or by clicking the "Add # Frame(s) to Timeline" button.
Dragging them from the bin will result in a green highlighted preview of where the image or images will be placed.
The key of the image will appear within the frame while previewing and then after being added.

To add multiple images to Timeline, change the value in the number input element between the "Import File" and "Add 1 Frame to Timeline"
Changing this number to 4 will update the button to the right

The cursor, highlighted in yellow, marks the position you are editing at.
If a frame is highlighted, any image added to the Timeline by clicking or pressing the "Add # Frame(s) to Timeline" button will be added at the selected frame.
If multiples of an image is added they will overwrite frames after the cursor.
After an image or multiple images are added the cursor will move to the following frame in the Timeline if it hasn't reached the end.

<a name="editing_the_timeline"></a>

**iv. Editing the Timeline**

The timeline can be edited by dragging and dropping selected frames or by cutting and pasting them.

Multiple frames can be selected by clicking and placing the cursor on the first or last frame you want selected and then holding `Shift` while selecting the last or first frame you want selected.
Everything in your selection will be highlighted in green.

The cursor can also be moved with the arrow keys `left` and `right` on your keyboard.

Deleting images from the Timeline will remove the contents of a frame highlighted by the cursor.
It will then move to the previous frame if there is one or remain at the first frame once it is reached.

<a name="previewing_timeline_video"></a>

**v. Previewing Timeline video**

At any point while editing your Timeline you can generate a preview by pressing the play button under the preview window.
A loading spinner will appear in the button for the length of time it takes to render a preview video.
If the Timeline has been changed since the last preview it will have to regenerate a new video.

Preview can be looped and this setting can be changed by clicking the toggle button that is labelled "Loop: OFF" by default.
Clicking it will cause it to enable loop and change the text of the button to "Loop: ON".

**vi. Exporting Timeline video**

Note: Your video will be 

<a name="sonify"></a>

#### Sonify

The Sonify window...

**i. Sonifying videos**

**ii. Sonifying still images**

**iii. Previewing audio**

**iv. Exporting audio**

<a name="visiualize"></a>

#### Visualize

The Visualize window...

**i. Visualizing MIDI**

**ii. Visualizing audio**

**iii. Previewing video**

**iv. Exporting video**

## IV. Saved Projects

Your work can be saved as a `.sio` file by pressing `Ctrl-S` or `Apple-S`.
These files can be restored by opening them with `Ctrl-O` or `Apple-O` and selecting the file.
Project files can also be dragged and dropped onto the application to open them.

Saved .sio files are JSON documents that are readable and editable with any text editor.
Corrupting or altering the structure of the JSON object which store application state may cause SpiritsInObjects to fail to load your file correctly. Otherwise, these files may be read, altered or generated by other applications.

##### References

1. <a name="footnote1"></a>The Chromium Project - Audio Video | [https://www.chromium.org/audio-video](https://www.chromium.org/audio-video)
2. <a name="footnote2"></a>npm - ffmpeg-static | [https://www.npmjs.com/package/ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static)