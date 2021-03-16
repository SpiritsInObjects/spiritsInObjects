const { MSICreator } = require('electron-wix-msi');
const { resolve } = require('path');
const PACKAGE = require(resolve('./package.json'));


// Step 1: Instantiate the MSICreator
const msiCreator = new MSICreator({
	appDirectory: resolve('./releases/win/spiritsInObjects-win32-x64'),
	description: 'Application for image sonification and sequencing',
	exe: 'spiritsInObjects',
	name: 'spiritsInObjects',
	manufacturer: 'dartmouth.edu',
	version: PACKAGE.version,
	outputDirectory: resolve('./releases/win')
});

async function createMSI () {
	// Step 2: Create a .wxs template file
	await msiCreator.create();

	// Step 3: Compile the template to a .msi file
	await msiCreator.compile();
}

createMSI();
