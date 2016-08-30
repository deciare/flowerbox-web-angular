/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({name: 'keyvalue'})
export class KeyValuePipe implements PipeTransform {
	transform(value: any): any {
		var pairs: any[] = [];

		for (let key in value) {
			pairs.push({
				key: key,
				value: value[key]
			});
		}

		return pairs;
	}
}