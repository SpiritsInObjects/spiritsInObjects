# spiritsInObjects

This is an app that sonifies images and visualizes sound as an aide in creating optical sound films.


### Dependencies

The application packages `ffmpeg` and `SoX` but requires the installation of `fluidsynth` to visualize MIDI files.

**Install on Mac**

Using [Homebrew](https://brew.sh/):

```bash
brew install fluid-synth
```

**Install on Linux (debian-based)**

```bash
apt install fluidsynth
```

### Running from source

To download the source and install all NPM packages required to run the application.

```bash
git clone https://github.com/sixteenmillimeter/spiritsInObjects.git
cd spiritsInObjects
npm install
```

To start it.

```bash
npm start
```

Alternately run all build scripts and start with Chrome Dev Tools open.

```bash
npm run dev
```