"use strict";

(angular
	.module(appName)
	.controller("PlayerCtrl", function($scope, $http, $timeout)
	{
		const savedVolume = localStorage.getItem("volume");
		const audioObj = new Audio();
		const audioCtx = new AudioContext();
		const audioAnl = audioCtx.createAnalyser();
		const audioSrc = audioCtx.createMediaElementSource(audioObj);
		const canvasEle = document.getElementById("visualiserCvs");
		const canvasCtx = canvasEle.getContext("2d");

		let updateTimer = null;
		let seekerDelay = null;
		let volBeforeMute = 0.0;
		let analyserBufr = null;
		let analyserData = null;
		let analyserBarW = 0;
		let analyserBarH = 0;
		let analyserBarX = 0;
		let canvasW = 0;
		let canvasH = 0;
		let nextTrackDelay = 1000;
		let playOpenedFile = false;
		let newPlaylist = false;
		let fadeOnPause = true;

		$scope.currVolume = savedVolume || 0.5;
		$scope.settingsOpen = false;
		$scope.appVersion = "0.0.1";
		$scope.volumeImg = "";
		$scope.shuffleImg = "shuffle";
		$scope.volumePcnt = 0;
		$scope.openFiles = "";
		$scope.currPlayIdx = 0;
		$scope.playlist = [];
		$scope.currTrack = "";
		$scope.volumeSlider = {"value": 0.0};
		$scope.randomOrder = false;

		$scope.playback = {
			"title": "",
			"artist": "",
			"playing": false,
			"time": 0.0,
			"duration": 0.0,
			"timePlayed": "00:00",
			"timeTotal": "00:00",
			"loop": false,
		};

		const addToPlaylist = (files) => {
			const playlistEmpty = ($scope.playlist.length == 0);

			for (const f of files)
				$scope.playlist.push(f);

			newPlaylist = true;

			if (!$scope.playback.playing && playlistEmpty && playOpenedFile)
				playMedia(0);
		};

		const playMedia = (index) => {
			newPlaylist = false;
			$scope.currPlayIdx = index;

			const file = $scope.playlist[$scope.currPlayIdx];
			const fileName = file.name;
			const filePath = file.path;
			const fileType = file.type;

			const req = new XMLHttpRequest();
				req.open("GET", filePath, true);
				req.responseType = "arraybuffer";

			req.onload = () => {
				let metadata = {};

				switch (fileType) {
					case "audio/mp3": {
						metadata = AudioMetadata.id3v2(req.response);
						break;
					}
					case "audio/ogg": {
						metadata = AudioMetadata.ogg(req.response);
						break;
					}
					default: {
						metadata = null;
						break;
					}
				}

				audioObj.src = filePath;

				$timeout(() => {
					if (metadata) {
						$scope.playback.title = metadata.title;
						$scope.playback.artist = metadata.artist;
					}
					else {
						$scope.playback.title = fileName;
						$scope.playback.artist = "";
					}

					$scope.playback.playing = true;
				});

				audioObj.play();

				updatePlaybackInfo();
				spectrumAnalyser();
			};

			req.send(null);
		};

		const playRandom = () => {
			$scope.currPlayIdx = Math.floor(Math.random() * Math.floor($scope.playlist.length));

			playMedia($scope.currPlayIdx);
		};

		const spectrumAnalyser = () => {
			canvasW = canvasEle.width;
			canvasH = canvasEle.height;

			analyserBufr = audioAnl.frequencyBinCount;
			analyserData = new Uint8Array(analyserBufr);
			analyserBarW = (Math.floor(canvasW / analyserBufr) * 2) - 2;

			analyserRender();
		};

		const analyserRender = () => {
			requestAnimationFrame(analyserRender);
			audioAnl.getByteFrequencyData(analyserData);

			analyserBarX = 1;
			canvasCtx.fillStyle = "#fff";
			canvasCtx.fillRect(0, 0, canvasW, canvasH);

			for (let i = 0; i < analyserBufr; i++) {
				analyserBarH = analyserData[i] / 4;

				canvasCtx.fillStyle = "#333";
				canvasCtx.fillRect(analyserBarX, canvasH - analyserBarH, analyserBarW, analyserBarH);

				analyserBarX += analyserBarW + 1;
			}
		};

		const formatTime = (input) => {
			const time = Math.round(input);
			const mins = Math.floor((time % 3600) / 60);
			const secs = Math.floor(time % 60);

			let output = "";
				output += String(mins || 0).padStart(2, "0");
				output += ":";
				output += String(secs || 0).padStart(2, "0");

			return output;
		};

		const updatePlaybackInfo = () => {
			$timeout(() => {
				const played = audioObj.currentTime;
				const total = audioObj.duration;

				$scope.playback.duration = total;
				$scope.playback.time = played;
				$scope.playback.timeTotal = formatTime(total);
				$scope.playback.timePlayed = formatTime(played);
			});

			updateTimer = setTimeout(updatePlaybackInfo, 1000);
		};

		const setVolume = (newVolume) => {
			audioObj.volume = newVolume;

			$timeout(() => {
				$scope.currVolume = newVolume;
				$scope.volumeImg = "volume-" + ((newVolume > 0.0) ? "on" : "off");
				$scope.volumePcnt = (newVolume * 100);
				$scope.volumeSlider.value = newVolume;
			});

			localStorage.setItem("volume", newVolume);
		}

		const fadePause = (mode) => {
			let oldVolume = $scope.currVolume;
			let newVolume = 0;

			if (mode) {

			}
			else {
				if ($scope.currVolume == 0.0) {
					audioObj.pause();

					$timeout(function() {
						$scope.playback.playing = false;
					});

					return;
				}
				else {
					newVolume = parseFloat((oldVolume - 0.1).toFixed(1));
				}
			}

			setVolume(newVolume);

			setTimeout(function() {
				fadePause(mode);
			}, 100);
		};

		$scope.seekerChanged = () => {
			$scope.togglePlayback(false, true);
			clearTimeout(updateTimer);
			clearTimeout(seekerDelay);

			$timeout(() => {
				$scope.playback.playing = false;
			});

			audioObj.currentTime = $scope.playback.time;

			seekerDelay = setTimeout(() => {
				$scope.togglePlayback(true, true);
				updatePlaybackInfo();
			}, 200);
		};

		$scope.openFile = (playFile) => {
			playOpenedFile = playFile;

			document.getElementById("openFile").click();
		};

		$scope.loadFiles = (files) => {
			addToPlaylist(files);

			if (playOpenedFile)
				playMedia($scope.playlist.length - 1);
		};

		$scope.togglePlayback = (play, seek) => {
			if (newPlaylist && $scope.playlist.length > 0) {
				if ($scope.randomOrder)
					playRandom();
				else
					playMedia(0);

				return;
			}

			if (play || !$scope.playback.playing) {
				audioObj.play();

				$timeout(() => {
					$scope.playback.playing = true;
				});
			}
			else {
				if (fadeOnPause) {
					fadePause(false);
				}
				else {
					audioObj.pause();

					$timeout(() => {
						$scope.playback.playing = false;
					});
				}
			}
		};

		$scope.stopPlayback = () => {
			audioObj.pause();
			audioObj.currentTime = 0;

			updatePlaybackInfo();
			clearTimeout(updateTimer);

			$timeout(() => {
				$scope.playback.playing = false;
				$scope.playback.timePlayed = "00:00";
				$scope.playback.timeTotal = "00:00";
			});
		};

		$scope.loopPlayback = () => {
			$scope.playback.loop = !$scope.playback.loop;
		};

		$scope.nextTrack = () => {
			if ($scope.currPlayIdx < ($scope.playlist.length - 1)) {
				$scope.currPlayIdx++;

				$scope.stopPlayback();
				playMedia($scope.currPlayIdx);
			}
		};

		$scope.prevTrack = () => {
			if ($scope.currPlayIdx > 0) {
				$scope.currPlayIdx--;

				$scope.stopPlayback();
				playMedia($scope.currPlayIdx);
			}
		};

		$scope.toggleMute = function() {
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

		$scope.changeTrack = (index) => {
			playMedia(index);
		};

		$scope.shufflePlaylist = () => {
			$scope.randomOrder = !$scope.randomOrder;
		};

		$scope.exitApp = () => {
			ipc.send("exitApp");
		};

		$scope.clearPlaylist = () => {
			$scope.playlist.length = 0;
		};

		document.addEventListener("drop", (event) => {
			event.preventDefault();
			event.stopPropagation();

			addToPlaylist(event.dataTransfer.files)
		});

		document.addEventListener("dragover", (event) => {
			event.preventDefault();
			event.stopPropagation();
		});

		document.getElementById("volumeSlider").addEventListener("wheel", (event) => {
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
/*
		document.addEventListener('dragenter', (event) => {
			console.log('drag enter');
		});

		document.addEventListener('dragleave', (event) => {
			console.log('drag leave');
		});
*/
		audioObj.addEventListener("ended", () => {
			setTimeout(() => {
				if ($scope.playlist.length > 1) {
					if ($scope.randomOrder) {
						playRandom();
					}
					else {
						if ($scope.currPlayIdx == ($scope.playlist.length - 1)) {
							if ($scope.playback.loop)
								playMedia(0);
						}
						else {
							$scope.nextTrack();
						}
					}
				}
				else if ($scope.playback.loop) {
					playMedia($scope.currPlayIdx);
				}
			}, nextTrackDelay);
		});

		audioAnl.fftSize = 64;
		canvasEle.width = 100;
		canvasEle.height = 56;
		canvasEle.style.display = "initial";

		audioSrc.connect(audioAnl);
		audioAnl.connect(audioCtx.destination);
		setVolume($scope.currVolume);
	})
);
