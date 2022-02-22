 'use strict';

 const packager = require('electron-packager');
 const { readFileSync } = require('fs');

 const appleId = (readFileSync('.appleId', 'utf8') ).trim();
 const appleIdPassword = (readFileSync('.applePwd', 'utf8') ).trim();
 // `security find-identity` to find exact string
 const appleIdentity = (readFileSync('.appleIdentity', 'utf8') ).trim();

 const pkg = require('../package.json');

 const config = {
 	dir : '.',
 	platform : 'darwin',
 	arch : 'x64',
 	prune : true,
    appBundleId : pkg.build.appId,
 	icon : './dist/icons/icon.icns',
 	ignore : '^/releases',
 	overwrite : true,
 	out : './releases/mac',
 	osxSign : {
 		identity : appleIdentity,
 		'hardened-runtime' : true,
 		entitlements : './entitlements.plist',
 		'entitlements-inherit': './entitlements.plist',
 		'signature-flags' : 'library'
 	},
 	osxNotarize : {
 		appleId,
 		appleIdPassword
 	}
};

packager(config);