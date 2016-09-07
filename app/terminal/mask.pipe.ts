/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
	name: "mask"
})
export class MaskPipe implements PipeTransform {
	/**
	 * Replaces each character in the input string with a mask string.
	 * For example, if the input string were a password, and the mask string is
	 * "*", then each character in the password would be replaced with a "*".
	 *
	 * If the input string contains a non-breaking space character, the
	 * non-breaking space character is preserved (not masked).
	 *
	 * @param {string} value - Input string
	 * @param {string} mask -  Masking string
	 * @return {string} Masked string
	 */
	transform(value: string, mask: string): string {
		var maskedValue: string = "";
		for (let i = 0; i < value.length; i++) {
			maskedValue += value[i] == "\xa0" ? "\xa0" : mask;
		}
		return maskedValue;
	}
}
