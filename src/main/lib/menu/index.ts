'use strict';

//const path = require('path'); //need for icon
const {app, Menu, shell} = require('electron');
const {
	is,
	appMenu,
	aboutMenuItem,
	openUrlMenuItem,
	openNewGitHubIssue,
	debugInfo
} = require('electron-util');

const showPreferences = () => {
	// Show the app's preferences here
};

let save : Function;
let restore : Function;
let saveAs : Function;

const helpSubmenu = [
	openUrlMenuItem({
		label: 'Website',
		url: 'https://github.com/sixteenmillimeter/spiritsInObjects#readme'
	}),
	openUrlMenuItem({
		label : 'Manual',
		url : 'https://sixteenmillimeter.github.io/spiritsInObjects/'
	}),
	openUrlMenuItem({
		label: 'Source Code',
		url: 'https://github.com/sixteenmillimeter/spiritsInObjects'
	}),
	{
		label: 'Report an Issue…',
		click() {
			const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->
---
${debugInfo()}`;

			openNewGitHubIssue({
				user: 'sixteenmillimeter',
				repo: 'spiritsInObjects',
				body
			});
		}
	}
];

if (!is.macos) {
	helpSubmenu.push(
		{
			type: 'separator'
		},
		aboutMenuItem({
			//icon: path.join(__dirname, 'static', 'icon.png'),
			text: 'Created by'
		})
	);
}

const macosTemplate = [
	appMenu([
		{
			label: 'Preferences…',
			accelerator: 'Command+,',
			click() {
				showPreferences();
			}
		}
	]),
	{
		role: 'fileMenu',
		submenu: [
			{
				label: 'Save',
				accelerator: 'CommandOrControl+S',
				click () {
					save();
				}
			},
			{
				label: 'Save As',
				accelerator: 'CommandOrControl+Shift+S',
				click () {
					saveAs();
				}
			},
			{
				label: 'Open',
				accelerator: 'CommandOrControl+O',
				click () {
					restore();
				}
			},
			{
				type: 'separator'
			},
			{
				role: 'close'
			}
		]
	},
	{
		role: 'editMenu'
	},
	{
		role: 'viewMenu'
	},
	{
		role: 'windowMenu'
	},
	{
		role: 'help',
		submenu: helpSubmenu
	}
];

// Linux and Windows
const otherTemplate = [
	{
		role: 'fileMenu',
		submenu: [
			{
				label: 'Save',
				accelerator: 'CommandOrControl+S',
				click () {
					save();
				}
			},
			{
				label: 'Save As',
				accelerator: 'CommandOrControl+Shift+S',
				click () {
					saveAs();
				}
			},
			{
				label: 'Open',
				accelerator: 'CommandOrControl+O',
				click () {
					restore();
				}
			},
			{
				type: 'separator'
			},
			{
				label: 'Settings',
				accelerator: 'Control+,',
				click() {
					showPreferences();
				}
			},
			{
				type: 'separator'
			},
			{
				role: 'quit'
			}
		]
	},
	{
		role: 'editMenu'
	},
	{
		role: 'viewMenu'
	},
	{
		role: 'help',
		submenu: helpSubmenu
	}
];

const template = process.platform === 'darwin' ? macosTemplate : otherTemplate;

export function createMenu (saveState : Function, restoreState : Function, saveStateAs : Function) {
	save = saveState;
	restore = restoreState;
	saveAs = saveStateAs;
	return Menu.buildFromTemplate(template);
}

module.exports.createMenu = createMenu;