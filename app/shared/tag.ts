/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
export class Tag {
	static makeTag(length?: number): string {
		var text = "";
	    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		// Default length is 16
		if (length === undefined) {
			length = 16;
		}

	    for (var i = 0; i < length; i++)
	        text += possible.charAt(Math.floor(Math.random() * possible.length));

	    return text;
	};
}
