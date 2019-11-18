const { MSICreator } = require('electron-wix-msi');
const PACKAGE = require('../package.json')

// Step 1: Instantiate the MSICreator
const msiCreator = new MSICreator({
	appDirectory: './releases/win/spiritsInObjects-win32-x64',
	description: 'Application for image sonification and sequencing',
	exe: 'spiritsInObjects',
	name: 'spiritsInObjects',
	manufacturer: 'dartmouth.edu',
	version: PACKAGE.version,
	outputDirectory: './releases/win'
});

// Step 2: Create a .wxs template file
msiCreator.create();

// Step 3: Compile the template to a .msi file
setTimeout(msiCreator.compile, 30000)
