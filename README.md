# spiritsInObjects

This is an app that sonifies images and visualizes sound as an aide in creating optical sound films.

Built off the work by [Carlos Dominguez](https://github.com/carlosdominguez) in the original project: [spiritsInObjects](https://github.com/carlosdominguez/spiritsInObjects).


### Dependencies

The application packages binaries for `ffmpeg` and `ffprobe` using [ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static) and [ffprobe-static](https://www.npmjs.com/package/ffprobe-static).


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