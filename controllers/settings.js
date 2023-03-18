"use strict";

(angular
	.module(appName)
	.controller("SettingsCtrl", function($scope, $http)
	{
		// settings - todo
		// delay between tracks
		// fade volume on pause
		// autoplay after adding to playlist

		const savedLang = localStorage.getItem("language");

		$scope.settings = {
			"language": ((savedLang) ? savedLang : $scope.$parent.currLang),
			"play_on_add": false,
			"fade_on_pause": false,
			"track_delay": 0.5,
			"langsMenu": {},
		};

		const getLanguages = () => {
			($http
				.get("./l10n/_langs.json")
				.then((response) => {
					try {
						const jsonDoc = response.data;

						for (let i in jsonDoc) {
							if (i != "END")
								$scope.settings.langsMenu[i] = jsonDoc[i];
						}
					}
					catch (e) {
						console.log(e);
					}
				})
			);
		}

		$scope.langChanged = () => {
			const newLang = $scope.settings.language;

			localStorage.setItem("language", newLang);
			$scope.$parent.setLanguage(newLang);
		};

		getLanguages();
	})
);
