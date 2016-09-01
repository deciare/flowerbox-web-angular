/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({name: 'keyvalue'})
export class KeyValuePipe implements PipeTransform {
	transform(obj: any): any {
		var pairs: any[] = [];

		if (typeof obj === "object") {
			if (obj instanceof Map) {
				obj.forEach((value, key) => {
					pairs.push({
						key: key,
						value: value
					});
				});
			}
			else {
				for (let key in obj) {
					pairs.push({
						key: key,
						value: obj[key]
					});
				}
			}
		}

		return pairs;
	}
}