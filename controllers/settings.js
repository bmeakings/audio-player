'use strict';

(angular
	.module(appName)
	.controller('SettingsCtrl', ($scope, $rootScope, $http) => {
		const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');

		$scope.settings = {
			'language': (savedSettings.language || $scope.$parent.currLang),
			'langsMenu': {},
			'play_on_add': (savedSettings.play_on_add == 'Y'),
			'fade_on_pause': (savedSettings.fade_on_pause == 'Y'),
			'track_delay': parseInt(savedSettings.track_delay) || 1,
			'show_cover_art': (savedSettings.show_cover_art == 'Y'),
			'show_analyser': (savedSettings.show_analyser == 'Y'),
		};

		function getLanguages() {
			($http
				.get('./l10n/_langs.json')
				.then((response) => {
					try {
						const jsonDoc = response.data;

						for (const i in jsonDoc) {
							if (i != 'END')
								$scope.settings.langsMenu[i] = jsonDoc[i];
						}
					}
					catch (e) {
						console.log(e);
					}
				})
			);
		}
/*
		$scope.langChanged = () => {
			const newLang = $scope.settings.language;

			$scope.$parent.setLanguage(newLang);
		};
*/
		$scope.$watchCollection('settings', () => {
			const saveData = {};

			for (const i in $scope.settings) {
				let val = $scope.settings[i];

				switch (typeof val) {
					case 'boolean': {
						val = (val) ? 'Y' : 'N';
						break;
					}
					case 'number': {
						val = String(val);
						break;
					}
				}

				saveData[i] = val;
			}

			localStorage.setItem('settings', JSON.stringify(saveData));
			$rootScope.$broadcast('settingsChanged', $scope.settings);
		});

		getLanguages();
	})
);
