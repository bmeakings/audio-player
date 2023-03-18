"use strict";

(angular
	.module(appName)
	.factory("services", function()
	{
		return {
			"cleanText": function(input)
			{
				let output = input;
					output = output.replaceAll("®", "");
					output = output.replaceAll("©", "");
					output = output.replaceAll("(TM)", "");
					output = output.replaceAll("(tm)", "");
					output = output.replaceAll("(R)", "");
					output = output.replaceAll("(r)", "");

				return output.trim();
			},
			"formatBytes": function(bytes, iec)
			{
				var thsnd = ((iec) ? 1024 : 1000);
				var units = [];
				var u = 0;

				if (iec)
					units = ["", "kiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
				else
					units = ["", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

				if (bytes < thsnd)
					return bytes + " Bytes";

				while (bytes >= thsnd)
				{
					bytes /= thsnd;
					u++;
				}

				return bytes.toFixed(1) + " " + units[u];
			},
		};
	})
);
