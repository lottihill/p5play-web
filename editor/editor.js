const log = console.log;
let isApp = typeof window.ipc !== 'undefined';

let ids = [
	'codeZone',
	'sceneZone',
	'mobileZone',
	'shareZone',

	'sceneZoneBtn',
	'fullscreenBtn',
	'mobileZoneBtn',
	'learnBtn',
	'shareZoneBtn',

	'codeNav',
	'openProjectLabel',
	'qrDiv',
	'webFolderSelector'
];

for (let id of ids) {
	window[id] = document.getElementById(id);
}

let codeNavTabs = [];

let ipAddress, homeDir, lang, proj, activeZone, activeZoneBtn;
let serverRunning = false;

let currentEditor;

async function openProject() {
	if (!isApp) return webFolderSelector.click();

	let { dir, files } = await ipc.invoke('selectFolder', lang.openProject);
	if (!files) return alert(lang.error + ': ' + lang.err0);

	proj = dir;
	openProjectLabel.innerText = dir.replace(homeDir, '~');

	_openProject(files);
}

async function _openProject(files) {
	if (!files.length) {
		alert('ERROR: There are no files in that folder.');
		return;
	}
	log(files);

	document.getElementById('zoneBtns').style.display = 'flex';

	let hasJS = false;
	for (let i = 0; i < files.length; i++) {
		let file = files[i];
		// extension
		let ext = file.type.split('/')[1];
		if (ext != 'javascript' && ext != 'json' && ext != 'css' && ext != 'html' && ext != 'markdown' && ext != 'text') {
			continue;
		}

		let path;
		if (isApp) {
			path = file.path;
		} else {
			path = file.webkitRelativePath;
			if (!hasJS) openProjectLabel.innerText = path.slice(0, path.indexOf('/'));
			path = path.slice(path.indexOf('/') + 1);
		}
		if (path.startsWith('node_modules')) continue;
		if (path.includes('package-lock')) continue;

		let idx = codeNav.children.length - 1;

		if (ext == 'javascript') {
			hasJS = true;
			sketchFileIdx = idx;
		}

		let tab = document.createElement('tab');
		tab.dataset.value = idx;
		tab.innerText = path;
		tab.addEventListener('click', () => {
			currentEditor = idx;
			let ed = codeZone.querySelector('#editor' + idx);
			if (ed) {
				if (!ed.classList.contains('active')) {
					ed.select();
				} else {
					ed.classList.remove('active');
					tab.classList.remove('active');
					resetMain();
				}
				return;
			}
			activateZone('codeZone');
			loadCodeEditor(files[i], idx);
		});
		codeNav.appendChild(tab);
	}

	if (!hasJS) {
		alert('ERROR: There are no JavaScript files in that folder.');
		return;
	}

	codeNavTabs = document.querySelectorAll('#codeNav > tab');

	if (!isApp) loadCodeEditor(files[0], 0);
}

function resetMain() {
	ipc.invoke('resizeWindow', 500, 132);
}

function expandMain() {
	ipc.invoke('resizeWindow', 500, 600);
}

/* MOBILE */

async function startServer() {
	let res = await ipc.invoke('startServer', proj);
	if (!res) return alert(lang.error + ': ' + lang.err1);
	serverRunning = true;

	if (document.body.offsetHeight < 200) expandMain();

	qrDiv.innerHTML = '';
	let qr0 = document.createElement('qr-code');
	qr0.id = 'qr0';
	qr0.innerHTML = `<img src="../assets/p5play_logo.svg" slot="icon">`;
	qr0.contents = 'p5play://' + ipAddress + ':7529';
	qr0.moduleColor = '#ff0a52';
	qr0.positionRingColor = '#ff0a52';
	qr0.positionCenterColor = '#b7ebff';
	qr0.maskXToYRatio = '1';
	qr0.addEventListener('codeRendered', () => {
		qr0.animateQRCode((targets, _x, _y, _count, entity) => ({
			targets,
			from: entity === 'module' ? Math.random() * 200 : 200,
			duration: 500,
			easing: 'cubic-bezier(1,1,0,.5)',
			web: {
				opacity: [0, 1],
				scale: [0.3, 1.13, 0.93, 1]
			}
		}));
	});
	qrDiv.append(qr0);
}

async function buildIOS() {}

/* CODE EDITOR */

let lastEdited = 0;

function codeEdited() {
	if (Date.now() - lastEdited < 1000) return;
	ipc.invoke(
		'writeFile',
		proj + '/' + codeNavTabs[currentEditor].innerText,
		ace.edit('editor' + currentEditor).getValue()
	);
}

function codeEditing() {
	log('editing');
	if (!isApp) return;
	setTimeout(codeEdited, 1000);
	lastEdited = Date.now();
}

async function loadCodeEditor(file, idx) {
	let code;
	if (isApp) {
		code = await ipc.invoke('readFile', proj + '/' + file.path);
	} else {
		code = await file.text();
	}

	if (!code) {
		alert('ERROR: There was an error reading the file.');
		return;
	}

	log(code);

	let ed = document.createElement('script');
	ed.type = 'text/plain';
	ed.id = 'editor' + idx;
	ed.innerHTML = code;
	codeZone.append(ed);

	let mode = file.type.split('/')[1];

	const editor = ace.edit('editor' + idx);
	editor.setOptions({
		mode: 'ace/mode/' + mode,
		fontSize: '14px',
		showFoldWidgets: false,
		showGutter: false,
		tabSize: 2,
		wrap: true
	});
	editor.setTheme('ace/theme/dracula');
	editor.getSession().on('change', codeEditing);

	ed.select = () => {
		activateZone('codeZone');
		ed.classList.add('active');
		codeNavTabs[idx].classList.add('active');
		if (isApp && document.body.offsetHeight < 200) expandMain();
	};
	ed.select();
}

/* SCENE EDITOR */

let q = new Q5('global');

function setup() {
	new Canvas(sceneZone.offsetWidth, sceneZone.offsetHeight);
	world.autoStep = false;
	// noStroke();

	// // tray that will hold the user's sprites and group sprites
	// fill('#303030');
	// rect(0, height - 160, width, 5);

	// fill('#131516');
	// for (let i = 0; i < 12; i++) {
	// 	let x = 10 + i * 156;
	// 	let y = height - 148;

	// 	rect(x, y, 140, 140, 5);
	// }
}

function draw() {
	background('green');
}

function loadScene() {
	// let src = ace.edit('editor' + currentEditor).getValue();

	// eval(src);

	// log(setup);
	// log(draw);
	let src = ace.edit('editor' + currentEditor).getValue();

	eval(src);

	if (typeof setup != 'function' && typeof draw != 'function') {
		alert('Error: setup and/or draw are not defined or not functions.');
		return;
	}

	log(setup);

	let start = src.slice(0, src.indexOf('function'));

	setup = setup.toString();
	setup = setup.slice(setup.indexOf('{'));

	let idx = setup.indexOf('new Canvas');
	let lineStart;
	// find new line before idx
	for (let i = idx; i >= 0; i--) {
		if (setup[i] == '\n') {
			lineStart = i;
			break;
		}
	}

	let lineEnd = setup.indexOf('\n', idx) + 1;

	// remove line with new Canvas
	setup = setup.slice(0, lineStart) + setup.slice(lineEnd);
	log(setup);
	eval(setup);

	log(p5play.groups);

	q._drawFn = draw;
}

/* UTILS */

function loadScript(src) {
	return new Promise(function (resolve) {
		let script = document.createElement('script');
		script.src = src;
		script.onload = resolve;
		document.body.appendChild(script);
	});
}

async function loadScripts(sources) {
	for (let src of sources) await loadScript(src);
}

async function start() {
	if (!isApp && navigator.onLine) {
		await loadScripts([
			'https://cdn.jsdelivr.net/npm/ace-builds@1.18.0/src-min-noconflict/ace.min.js',
			'https://cdn.jsdelivr.net/npm/ace-builds@1.18.0/src-min-noconflict/ext-language_tools.js'
		]);
		loadScript('https://cdn.jsdelivr.net/npm/@bitjson/qr-code@1.0.2/dist/qr-code.js');
	} else {
		await loadScripts([
			'../learn/ace/ace.min.js',
			'../learn/ace/ext-language_tools.js',
			'../learn/ace/mode-javascript.js',
			'../learn/ace/theme-dracula.js',
			'../learn/ace/theme-xcode.js',
			'../node_modules/@bitjson/qr-code/dist/qr-code.js'
		]);
	}

	if (isApp) {
		ipAddress = await ipc.invoke('getIpAddress');
		homeDir = await ipc.invoke('getHomeDir');
		resetMain();

		const externalLinks = document.getElementsByClassName('externalLink');

		for (const link of externalLinks) {
			link.addEventListener('click', function (event) {
				event.preventDefault();
				const href = this.getAttribute('href');
				ipc.invoke('openInBrowser', href);
			});
		}
	} else {
		webFolderSelector.addEventListener('change', () => _openProject(webFolderSelector.files));
	}

	lang = await (await fetch('../lang/en/en.json')).json();
	lang = lang.editor;
	for (let key in lang.DOM) {
		let el = document.getElementById(key);
		if (el) el.innerHTML += lang.DOM[key];
	}
	lang = lang.msgs;
}
start();

const zones = document.getElementsByClassName('zone');

function activateZone(zone) {
	for (let tab of codeNavTabs) tab.classList.remove('active');
	for (let ed of codeZone.children) ed.classList.remove('active');
	activeZone?.classList.remove('active');
	activeZoneBtn?.classList.remove('active');
	activeZone = window[zone];
	activeZoneBtn = window[zone + 'Btn'];
	window[zone + 'Btn']?.classList.add('active');
	window[zone].classList.add('active');
}

fullscreenBtn.addEventListener('click', () => {
	if (!serverRunning) startServer();
	ipc.invoke('createWindow', 'http://localhost:7529');
});

mobileZoneBtn.addEventListener('click', () => {
	activateZone('mobileZone');
	if (!serverRunning) startServer();
});

learnBtn.addEventListener('click', () => {
	ipc.invoke('createWindow', '../learn/index.html');
});

shareZoneBtn.addEventListener('click', () => {
	activateZone('shareZone');
});

sceneZoneBtn.addEventListener('click', () => {
	// activateZone('sceneZone');
	// TODO: make window bigger

	loadScene();
});
