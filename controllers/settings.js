'use strict';

(angular
	.module(appName)
	.controller('SettingsCtrl', ($scope, $rootScope, $http) => {
		const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');

		$scope.settings = {
			'language': (savedSettings.language || $scope.$parent.currLang),
			'langsMenu': {},
			'play_on_add': (savedSettings.play_on_add || true),
			'fade_on_pause': (savedSettings.fade_on_pause || false),
			'track_delay': (savedSettings.track_delay || 1),
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

		$scope.langChanged = function() {
			const newLang = $scope.settings.language;

			$scope.$parent.setLanguage(newLang);
		};

		$scope.$watchCollection('settings', () => {
			localStorage.setItem('settings', JSON.stringify($scope.settings));
			$rootScope.$broadcast('settingsChanged', $scope.settings);
		});

		getLanguages();
	})
);
