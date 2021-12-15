# SpiritsInObjects User Manual

## I. Introduction

SpiritsInObjects is a software tool that provides a means for sonifying and sequencing a set of images, sonifying entire videos and visualizing MIDI or audio. 
It is meant to aid in the process of creating optical sound films by allowing a user to import a set of images, organize/sequence them onto a timeline in either repeating or unique patterns, listen to the sounds that they produce, and output results in three formats: 

1. preview playback within the program
2. a WAV file (of sonified video or images)
3. a MOV video (of sequences or visualized audio)

This manual will guide you through the SpiritsInObjects program.

## II. Getting Started 
 
**A. Creating your image-set:**

**i. Dimensions:**
SpiritsInObjects will accept images and video of any dimensions, but for the purposes of making sound-on-film video, 16x9 is the ideal dimension ratio.

**i. Soundtrack location:** 
SpiritsInObjects attempts to recreate the sounds that are produced by the optical sound component within 16mm projectors. 
These sound devices work by reading light that passes through the soundtrack portion (the side without the sprocket-holes) of single perf 16mm film. 
SpiritsInObjects only analyzes the right 19% of each image. 
Any visual data to the left of this portion is ignored and doesn’t affect the sound in any way. 
Therefore, when creating images for use with this program, make sure to note that you will only be hearing the right 19% of each image. 
 
**ii. Filename organization:**
Another important detail to note while preparing your images is their filename.
This will affect the way that the program organizes your images and composes the After Effects Expressions script.
To avoid any issues, precede each filename with a different number and make sure that any other characters following this number are identical across your image-set. For example: “001-myImageSet.jpg”, “002-myImageSet.jpg”, etc. 
It is recommended to create a folder for your image-set containing only the images for this specific soundtrack. 
 
**iii. Blank zero-image:**
Within your image-set, include a blank image that is filled with black pixels. 
Make sure that it is numbered “0” so that it comes before the rest of your images (noting the previous example, this file should be named “000-myImageSet.jpg”). 
This image will not be used in SpiritsInObjects, but rather in your After Effects 
project. 
 
**iv. Image color:**
SpiritsInObjects does not take color into consideration when analyzing images. 
It only calculates the average luminance within the soundtrack portion of the imported pictures. 
 
**B. Other details**

**i. Film size and frame rate:** 
SpiritsInObjects assumes that your images will end up on Super16mm film and run through a 16mm projector at 24 frames per second. 
 
**ii. Audio sample rate:** 
The audio in this application and the WAV file that it exports are played/recorded at a 48 kHz sampling rate. 
 
## III. Using the Application 
 
Workflow: 

**A. Declare frame count:** 
Upon opening, the application should look like the image in Figure 1. Start by declaring the total frame count of your soundtrack. 
Enter the number of frames in the top-left text field labeled “Total Frame Count” and click the button underneath it labeled “set length of soundtrack.” 
You won’t be able to edit this number after pressing the button. 
 
**B. Import images:** 
Next, import your images. 
Click the “Choose Files” button. 
It will open an Explorer/Finder window. 
Navigate to the folder containing your images and select/load all of the images (except for the blank “0” frame) that you wish to use in the soundtrack at once. 
You won’t be able to select more/less images afterwards. 
This process will take more/less time depending on the number and size of images that you import. 
You’ll see your images once they’ve loaded (first a gray frame which serves as our blank frame, and then your actual images). 
You can use the “-“ and “+” keys to zoom in/out of the images that you’ve imported. 
 
**C. Hear your images:** 
Upon loading, your window should resemble Figure 2. 
You can use our computer’s keyboard to listen to the sounds that our images produce. 
Keys are assigned in the following configuration on a standard ANSI keyboard and are case-sensitive: 

* The first ten images, 0-9, can be played with keys “0” through “9”, respectively, with “0” being our gray frame, “1” being the first image from your imported set, “2” being the next one and so on until “9”. 
* The next ten images, 10-19, are assigned left-to-right to keys “q” through “p”. 
* Images 20-29 are assigned to keys “a” through “;”. 
* Images 30-39 are assigned to keys “z” through “/”. 
 
**D. Sequencing images:** 
Each image serves as a button allowing you to sequence your frames and edit them on a timeline.
Upon clicking an image, the program will prompt you for several things in order to properly sequence your sound. 

The prompts ask: 

**i.** “When do you want me to sound? (frame number)” the number of the frame where the image should be inserted. 
Type a number and press “OK”. 
This is the starting point of your sound. 
You should note that the frame numbers are Zero-Based, meaning that the first frame is numbered “0”, the second is “1”, and the final is equal to one less than the total frame count of your soundtrack. 

**ii.** “How long should I sound? (in frames)” the number of frames that denotes the length of your sound. 
Type a number and press “OK”. 

**iii.** “Should I repeat? (1 for yes, 0 for no)” type the number “1” if you’d like your sound to repeat or “0” if you’d like to just enter a single sound. 
If you enter “0”, the prompts will stop and you’ll insert one sound into your timeline. 

**iv.** “How many frames between each repetition?” the number of frames between the starting frames of each repeated sound. 
Type a number and press “OK”. 

**v.** “How many times should I play?” the total number of times that your sound plays, including repetitions. 
Type a number and press “OK”. 
After this prompt, you’ll have inserted a number of sounds into your timeline. 
When the prompts finish, you’ll have sequenced some frames into your soundtrack’s timeline. 
You can use the two sliders under the image-buttons to view your timeline. 
The slider labeled “Timeline Range” allows you to display a portion of the timeline. 
The other slider, “Timeline Zoom” zooms in/out of the timeline viewing area. 
The image in Figure 3 shows what your window should look like if you set the “Timeline Range” slider and scroll down to show the timeline of a soundtrack with the following properties: 

* It has a total frame count of 48. 
* The first image from the imported set is played at frame 3 for a length of 3 frames. It is then set to repeat every 10 frames and plays a total of 4 times. 

**E. Results:**
As mentioned in the introduction, you can output results in three formats: 

1. playback within the program, 
2. a WAV file, and 
3. an Adobe After Effects Expressions script. 

**i. Playback:** 
if you’d like to preview what you’ve inserted into the timeline, you can press the spacebar to listen back to your soundtrack. 
The program will ask you to input the point at which you’d like to start the soundtrack and when you press “OK”, it will immediately start to play. 

**ii. WAV file:** 
if you scroll to the top of the window, you’ll see a button labeled “export a wav file”. 
When this is clicked, the program will open an Explorer/Finder window for you to select the filename and destination of a .wav file that can be used to play back your soundtrack in other programs. 

**iii. After Effects Expressions script:** 
under the “export a wav file” button, there is a button labeled “generate after effects expressions script”. 
Once clicked, this button will generate a few lines of code that can be used to sequence your images in Adobe After Effects for further processing. 
The code will appear underneath the button and can be copied/pasted into After Effects or a text file (it is recommended that you generate a script for every soundtrack that you wish to keep and save it in text file, since saving is not yet a feature in this program). Figure 4 shows what this should look like. 
The next section covers the process of using Adobe After Effects in conjunction with this program. 
 
## IV. After Effects 
 
This section will cover the steps necessary for creating a sequence of images with the script that was generated in SpiritsInObjects. 
 
**A. Before we begin:**
make sure that the folder of images you used in SpiritsInObjects is the exact one that you will be using in After Effects (AE). 
Also verify that you have a “0” frame that is completely black within this folder. 
Without these items, the script will sequence the wrong images. 
 
**B. Startup:** 
open Adobe After Effects and create a new Composition. 
A dialog will come up asking you to specify certain details for the composition (shown in Figure 5). 
Make sure that you set these details correctly: 

* Preset is set to “HDTV 1080 24”. 
* Frame Rate to 24 frames per second. 
* Other details can be changed/set later if necessary. 
 
**C. Image import:**
Once you click “OK” in the Composition Settings dialog box, your AE window should resemble 
Figure 6. You’ll notice that your composition (“Comp 1”) appears in the project window of your workspace. 
Import your images by either clicking “File -> Import -> File...” in the menu bar, pressing Cmd+I (Ctrl+I in Windows), or double-clicking underneath your composition in the Project window. 
An Explorer/Finder window will come up. 
Navigate to your image folder and click on the first image. Make sure the “JPEG Sequence” and “Force alphabetical order” boxes are checked. Finally, click “Open”. 
You’ll now notice that a sequence named after your folder has appeared under your composition in the Project window. 
Click on it and then go to “File -> Interpret Footage -> Main...”. 
A dialog box (shown in Figure 7) should open up. Under “Frame Rate”, click on “Assume this frame rate” and set it to 24 frames per second. 
Click “OK”. 
 
If you double-click your image-sequence and press the spacebar, you can check to see whether or not all of your images were imported in the correct order. 
It is imperative to the function of this process that your images exist in the same order from when you used them in SpiritsInObjects. 
 
**D. Sequencing with the script:**
Drag your image sequence into the Composition window in the lower-left of the workspace. 
Your image-set is now within your composition. 
Click on your image-set within the Composition window and then go to “Layer -> Time -> Enable Time Remapping”. 
A “Time Remap” layer should have appeared underneath your image-set. 
Click on Time Remap and go to “Animation -> Add Expression”. Another item titled “Expression: Time Remap” should have appeared and the text “timeRemap” within the timeline to the right should be highlighted. 
In this text-field is where you will paste the AE Expressions script from SpiritsInObjects. 
Figure 8 shows what your workspace should look like once you’ve pasted your script into AE. 
 
Once your script has been pasted, notice the pale blue bar in the timeline above the script.
This is the sequence with the correct timing information. 
However, it is not long enough to complete the sequence. 
If you hover over the right edge of the bar, you can drag it out to your desired length. 
The script will continue to organize the images on the timeline even though your sequence may be longer than your original soundtrack in SpiritsInObjects. 
Therefore, be sure to take note of the length of your sequences in the AE timeline. 
 
**E. Post processing:**
You have just sequenced your image-set, but it isn’t necessary to stop here. 
You can now take advantage of all that AE has to offer. Applying different effects and animations to your sequence can a ffect the sound in several ways: 

* Fading in/out of images over time will increase/decrease their volume when they are reeled through a projector. You can use this effect to create slow swells in volume (fade over many frames), or quick attacks (fade over very few frames) to give your sounds some natural qualities. 
* Zooming in/out of images will decrease/increase their frequency content. 
* Blurring/Sharpening will change the qualities of the sounds that you end up producing. Blurring will smooth out your images and filter out some of the high-frequency content of your sounds, while Sharpening will bring out the edges in your images, creating noisier textures. 
* Other effects: experiment with what After Effects has to offer. Apply effects and think about how they will affect the sounds produced by the projector. 
* Other scripts: create new scripts with SpiritsInObjects and use them in different portions of your timeline in order to create progressions of rhythms and textures.