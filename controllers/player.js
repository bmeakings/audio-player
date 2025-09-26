'use strict';

(angular
	.module(appName)
	.controller('PlayerCtrl', ($scope, $timeout) => {
		const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');
		const savedVolume = localStorage.getItem('volume');
		const audioObj = new Audio();
		const audioCtx = new AudioContext();
		const audioAnl = audioCtx.createAnalyser();
		const audioSrc = audioCtx.createMediaElementSource(audioObj);
		const canvasEle = document.getElementById('visualiserCvs');
		const canvasCtx = canvasEle.getContext('2d');

		let updateTimer = null;
		let seekerDelay = null;
		let volBeforeMute = 0.0;
		let volBeforeFade = 0.0;
		let analyserBufr = null;
		let analyserData = null;
		let analyserBarW = 0;
		let analyserBarH = 0;
		let analyserBarX = 0;
		let canvasW = 0;
		let canvasH = 0;
		let playOpenedFile = false;
		let newPlaylist = false;
		let ctrlKeyDown = false;
		let shiftKeyDown = false;
		let altKeyDown = false;

		$scope.settings = savedSettings;
		$scope.settingsOpen = false;
		$scope.appVersion = '0.0.1';
		$scope.shuffleImg = 'shuffle';
		$scope.volumeImg = '';
		$scope.currVolume = parseFloat(savedVolume) || 0.5;
		$scope.volumePcnt = 0;
		$scope.openFiles = '';
		$scope.currPlayIdx = 0;
		$scope.playlist = [];
		$scope.currTrack = '';
		$scope.volumeSlider = {'value': 0.0};
		$scope.randomOrder = false;
		$scope.coverArtImg = '';

		$scope.playback = {
			'title': '',
			'artist': '',
			'playing': false,
			'time': 0.0,
			'duration': 0.0,
			'timePlayed': '00:00',
			'timeTotal': '00:00',
			'loop': false,
		}

		function setPlaybackStatus(status) {
			$timeout(() => {
				$scope.playback.playing = status;
			});
		}

		function addToPlaylist(files, openedFile) {
			const playlistEmpty = ($scope.playlist.length == 0);

			for (const f of files)
				$scope.playlist.push(f);

			newPlaylist = true;

			if (!$scope.playback.playing && playlistEmpty && playOpenedFile)
				playMedia(0, 'addToPlaylist');
		}

		function playMedia(index, caller) {
			console.log('playMedia', index, caller);

			newPlaylist = false;
			$scope.currPlayIdx = index;
			$scope.coverArtImg = '';

			const file = $scope.playlist[$scope.currPlayIdx];
			const fileName = file.name;
			const fileType = file.type;
			const filePath = electronAPI.getFilePath(file);

			(electronAPI.getMusicMetadata(filePath)
				.then((data) => {
					console.log('*** metadata ***');
					console.log(data);

					const coverArt = {format: '', dataURI: ''};

					if (data.common.picture) {
						const artImg = data.common.picture[0];

						coverArt.format = artImg.format;
						coverArt.dataURI += 'data:' + coverArt.format + ';base64,';
						coverArt.dataURI += btoa(String.fromCharCode.apply(null, artImg.data));

						$scope.coverArtImg = coverArt.dataURI;
					}

					$timeout(() => {
						$scope.playback.title = (data.common.title || fileName);
						$scope.playback.artist = (data.common.artist || '');
					});
				})
				.catch((e) => {
					console.log(e);

					$timeout(() => {
						$scope.playback.title = fileName;
						$scope.playback.artist = '';
					});
				})
				.finally(() => {
					audioObj.src = filePath;

					setPlaybackStatus(true);
					updatePlaybackInfo();
					audioObj.play();
				})
			);
		}

		function playRandom() {
			$scope.currPlayIdx = Math.floor(Math.random() * Math.floor($scope.playlist.length));

			playMedia($scope.currPlayIdx, 'playRandom');
		}

		function spectrumAnalyser() {
			canvasW = canvasEle.width;
			canvasH = canvasEle.height;

			analyserBufr = audioAnl.frequencyBinCount;
			analyserData = new Uint8Array(analyserBufr);
			analyserBarW = (Math.floor(canvasW / analyserBufr) * 2) - 2;

			analyserRender();
		}

		function analyserRender() {
			requestAnimationFrame(analyserRender);
			audioAnl.getByteFrequencyData(analyserData);

			analyserBarX = 1;
			canvasCtx.fillStyle = '#fff';
			canvasCtx.fillRect(0, 0, canvasW, canvasH);

			for (let i = 0; i < analyserBufr; i++) {
				analyserBarH = analyserData[i] / 4;

				canvasCtx.fillStyle = '#333';
				canvasCtx.fillRect(analyserBarX, canvasH - analyserBarH, analyserBarW, analyserBarH);

				analyserBarX += analyserBarW + 1;
			}
		}

		function formatTime(input) {
			const time = Math.round(input);
			const mins = Math.floor((time % 3600) / 60);
			const secs = Math.floor(time % 60);

			let output = '';
				output += String(mins || 0).padStart(2, '0');
				output += ':';
				output += String(secs || 0).padStart(2, '0');

			return output;
		}

		function updatePlaybackInfo() {
			$timeout(() => {
				const played = audioObj.currentTime;
				const total = audioObj.duration;

				$scope.playback.duration = total;
				$scope.playback.time = played;
				$scope.playback.timeTotal = formatTime(total);
				$scope.playback.timePlayed = formatTime(played);
			});

			updateTimer = setTimeout(updatePlaybackInfo, 500);
		}

		function setVolume(newVolume) {
			audioObj.volume = newVolume;

			$timeout(() => {
				$scope.currVolume = newVolume;
				$scope.volumeImg = 'volume-' + ((newVolume > 0.0) ? 'on' : 'off');
				$scope.volumePcnt = (newVolume * 100);
				$scope.volumeSlider.value = newVolume;
			});

			localStorage.setItem('volume', newVolume);
		}

		function incrementVolume(action) {
			let oldVolume = audioObj.volume;
			let newVolume = oldVolume;

			switch (action) {
				case '-': {
					if (oldVolume > 0.0)
						newVolume = parseFloat((oldVolume - 0.1).toFixed(1));

					break;
				}
				case '+': {
					if (oldVolume < 1.0)
						newVolume = parseFloat((oldVolume + 0.1).toFixed(1));

					break;
				}
			}

			if (newVolume != oldVolume)
				setVolume(newVolume);
		}

		function fadePause(volume) {
			let newVolume = 0;
			let finished = false;

			if ($scope.playback.playing) {
				if (volume == 0.0) {
					finished = true;

					audioObj.pause();
				}
				else {
					newVolume = parseFloat((volume - 0.1).toFixed(1));
				}
			}
			else {
				if (volume == volBeforeFade) {
					finished = true;

					audioObj.play();
				}
				else {
					newVolume = parseFloat((volume + 0.1).toFixed(1));
				}
			}

			if (finished) {
				setPlaybackStatus(!$scope.playback.playing);
			}
			else {
				setVolume(newVolume);

				setTimeout(() => {
					fadePause(newVolume);
				}, 100);
			}
		}

		$scope.seekerChanged = () => {
			$scope.togglePlayback(false, true);
			clearTimeout(updateTimer);
			clearTimeout(seekerDelay);
			setPlaybackStatus(false);

			audioObj.currentTime = $scope.playback.time;

			seekerDelay = setTimeout(() => {
				$scope.togglePlayback(true, true);
				updatePlaybackInfo();
			}, 200);
		};

		$scope.openFile = (playFile) => {
			playOpenedFile = playFile;

			document.getElementById('openBtn').blur();
			document.getElementById('openFile').click();
		};

		$scope.loadFiles = (files) => {
			addToPlaylist(files, true);

			if (playOpenedFile) {
				playOpenedFile = false;

				playMedia($scope.playlist.length - 1, 'loadFiles');
			}
		};

		$scope.togglePlayback = (play, seek) => {
			document.getElementById('pauseBtn').blur();

			if (newPlaylist && $scope.playlist.length > 0) {
				if ($scope.randomOrder)
					playRandom();
				else
					playMedia(0, 'togglePlayback');

				return;
			}

			if (play || !$scope.playback.playing) {
				if ($scope.settings.fade_on_pause) {
					fadePause(0);
				}
				else {
					audioObj.play();
					setPlaybackStatus(true);
				}
			}
			else {
				if ($scope.settings.fade_on_pause) {
					volBeforeFade = $scope.currVolume;

					fadePause($scope.currVolume);
				}
				else {
					audioObj.pause();
					setPlaybackStatus(false);
				}
			}
		};

		$scope.stopPlayback = () => {
			document.getElementById('stopBtn').blur();
			audioObj.pause();
			audioObj.currentTime = 0;

			updatePlaybackInfo();
			setPlaybackStatus(false);
			clearTimeout(updateTimer);

			$timeout(() => {
				$scope.playback.timePlayed = '00:00';
				$scope.playback.timeTotal = '00:00';
			});
		};

		$scope.loopPlayback = () => {
			$scope.playback.loop = !$scope.playback.loop;

			document.getElementById('loopBtn').blur();
		};

		$scope.nextTrack = () => {
			document.getElementById('nextBtn').blur();

			if ($scope.currPlayIdx < ($scope.playlist.length - 1)) {
				$scope.currPlayIdx++;

				$scope.stopPlayback();
				playMedia($scope.currPlayIdx, 'nextTrack');
			}
		};

		$scope.prevTrack = () => {
			document.getElementById('prevBtn').blur();

			if ($scope.currPlayIdx > 0) {
				$scope.currPlayIdx--;

				$scope.stopPlayback();
				playMedia($scope.currPlayIdx, 'prevTrack');
			}
		};

		$scope.toggleMute = () => {
			document.getElementById('muteBtn').blur();

			if ($scope.currVolume > 0.0) {
				volBeforeMute = $scope.currVolume;

				setVolume(0.0);
			}
			else {
				setVolume(volBeforeMute);
			}
		};

		$scope.changeVolume = () => {
			setVolume($scope.volumeSlider.value);
		};

		$scope.trackSelected = () => {
			const menu = document.getElementById('playlistMenu');

			$scope.currPlayIdx = menu.selectedIndex;
		};

		$scope.changeTrack = (index) => {
			document.getElementById('playlistMenu').blur();
			playMedia(index, 'changeTrack');
		};

		$scope.shufflePlaylist = () => {
			$scope.randomOrder = !$scope.randomOrder;
		};

		$scope.clearPlaylist = () => {
			$scope.playlist.length = 0;
		};

		$scope.$on('settingsChanged', (event, data) => {
			$scope.settings = data;
		});

		document.getElementById('volumeSlider').addEventListener('wheel', (event) => {
			let oldVolume = audioObj.volume;
			let newVolume = oldVolume;

			if (event.deltaY > 0) {
				if (oldVolume > 0.0)
					newVolume = parseFloat((oldVolume - 0.1).toFixed(1));
			}
			else {
				if (oldVolume < 1.0)
					newVolume = parseFloat((oldVolume + 0.1).toFixed(1));
			}

			if (newVolume != oldVolume)
				setVolume(newVolume);
		});

		document.getElementById('playlistArea').addEventListener('keyup', (event) => {
			console.log('key up (playlist)', event.code);
			document.getElementById('playlistArea').blur();
			event.stopPropagation();

			switch (event.code) {
				case 'Enter': case 'NumpadEnter': {
					playMedia($scope.currPlayIdx, 'playlist');
					break;
				}
				case 'Space': {
					$scope.togglePlayback();
					event.preventDefault();
					break;
				}
			}
		});

		document.addEventListener('keydown', (event) => {
			console.log('key down', event.code);

			switch (event.code) {
				case 'ControlLeft': case 'ControlRight': {
					ctrlKeyDown = true;
					break;
				}
				case 'ShiftLeft': case 'ShiftRight': {
					shiftKeyDown = true;
					break;
				}
				case 'AltLeft': case 'AltRight': {
					altKeyDown = true;
					break;
				}
			}
		});

		document.addEventListener('keyup', (event) => {
			console.log('key up (window)', event.code);

			switch (event.code) {
				case 'ControlLeft': case 'ControlRight': {
					ctrlKeyDown = false;
					break;
				}
				case 'ShiftLeft': case 'ShiftRight': {
					shiftKeyDown = false;
					break;
				}
				case 'AltLeft': case 'AltRight': {
					altKeyDown = false;
					break;
				}
				case 'Space': {
					$scope.togglePlayback();
					break;
				}
				case 'KeyM': {
					$scope.toggleMute();
					break;
				}
				case 'KeyO': {
					if (ctrlKeyDown)
						$scope.openFile(true);

					break;
				}
/*
				case 'ArrowLeft': {
					$scope.jumpVideoTime('B');
					break;
				}
				case 'ArrowRight': {
					$scope.jumpVideoTime('F');
					break;
				}
*/
				case 'ArrowUp': {
					incrementVolume('+');
					break;
				}
				case 'ArrowDown': {
					incrementVolume('-');
					break;
				}
			}
		});

		document.addEventListener('drop', (event) => {
			event.preventDefault();
			event.stopPropagation();
			addToPlaylist(event.dataTransfer.files)
		});

		document.addEventListener('dragover', (event) => {
			event.preventDefault();
			event.stopPropagation();
		});

		audioObj.addEventListener('ended', () => {
			setPlaybackStatus(false);

			setTimeout(() => {
				if ($scope.playlist.length > 1) {
					if ($scope.randomOrder) {
						playRandom();
					}
					else {
						if ($scope.currPlayIdx == ($scope.playlist.length - 1)) {
							if ($scope.playback.loop)
								playMedia(0, 'looped 1');
						}
						else {
							$scope.nextTrack();
						}
					}
				}
				else if ($scope.playback.loop) {
					playMedia($scope.currPlayIdx, 'looped 2');
				}
			}, $scope.settings.track_delay * 1000);
		});

		audioAnl.fftSize = 64;
		canvasEle.width = 100;
		canvasEle.height = 100;
		canvasEle.style.display = 'initial';

		audioAnl.connect(audioCtx.destination);
		audioSrc.connect(audioAnl);
		spectrumAnalyser();
		setVolume($scope.currVolume);
	})
);
