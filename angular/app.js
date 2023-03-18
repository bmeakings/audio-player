"use strict";

const appName = "MediaPlayer";
const appUpdateID = "mediaplayer";
const ipc = require("electron").ipcRenderer;

(angular
	.module(appName, ["ngMaterial"])
	.controller("MainCtrl", function($scope, $http)
	{
		const savedLang = localStorage.getItem("language");

		$scope.settingsOpen = false;
		$scope.currLang = savedLang || "en";
		$scope.langStrings = {};

		$scope.setLanguage = (lang) => {
			($http
				.get("./l10n/" + lang + ".json")
				.then((response) => {
					try {
						$scope.langStrings = response.data;
					}
					catch (e) {
						console.log(e);
					}
				})
			);
		};

		$scope.openSettings = () => {
			$scope.settingsOpen = true;
		};

		$scope.closeSettings = () => {
			$scope.settingsOpen = false;
		};

		$scope.setLanguage($scope.currLang);
	})
);
