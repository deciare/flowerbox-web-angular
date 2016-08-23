/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs/Subscription";

import { EventStream, EventStreamItem } from "../models/event-stream";
import { WobInfo, WobInfoList } from "../models/wob";

import { InteractiveChunk, InteractiveChunkComponent } from "../shared/interactive-chunk.component";

import { StatusService } from "./status.service";

@Component({
	moduleId: module.id,
	selector: "infobar",
	styles: [`
		header {
			position: fixed;
			background-color: #111111;
			background-image: url(image/box8-icon.png);
			background-position: -5px -3px;
			background-repeat: no-repeat;
			border-bottom: 1px solid #666666;
			box-shadow: 0 3px 9px rgba(0, 0, 0, 0.5);
			font-family: Consolas, Monaco, "Liberation Mono", Fixed, monospace;
			padding-left: 26px;
			width: 100%;
		}
	`],
	template: `
		<header>
			<span class="brand primary">Flower</span><span class="brand secondary">box</span>
			<span *ngIf="!player">&nbsp;Not logged in</span>
			<span *ngIf="player">
				&nbsp;{{player.name}}
				<span *ngIf="location" aria-label="Current location:">
					&nbsp;<span class="glyphicon glyphicon-screenshot" title="Location" aria-hidden="true"></span>
					{{location.name}} (#{{location.id}})
				</span>
				<span *ngIf="locationPlayers" aria-label="Number of other players here:">
					&nbsp;<span class="glyphicon glyphicon-user" title="Other players here" aria-hidden="true"></span>
					{{locationPlayers.list.length - 1}}
				</span>
			</span>
		</header>
	`
})
export class InfobarComponent implements OnDestroy, OnInit {
	private locationSubscription: Subscription;
	private locationContentsSubscription: Subscription;
	private locationPlayersSubscription: Subscription;
	private playerSubscription: Subscription;

	location: WobInfo;
	locationChunk: any;
	locationContents: WobInfoList;
	locationPlayers: WobInfoList;
	player: WobInfo;
	playerChunk: any;

	constructor(
		private statusService: StatusService
	) {
		// Dependency injetion only; no code
	}

	ngOnInit() {
		this.locationSubscription = this.statusService.location.subscribe((location) => {
			this.location = location;
		});

		this.locationContentsSubscription = this.statusService.locationContents.subscribe((contents) => {
			this.locationContents = contents;
		});

		this.locationPlayersSubscription = this.statusService.locationPlayers.subscribe((players) => {
			this.locationPlayers = players;
		});

		this.playerSubscription = this.statusService.player.subscribe((player) => {
			this.player = player;
		});
	}

	ngOnDestroy() {
		this.locationSubscription.unsubscribe();
		this.locationContentsSubscription.unsubscribe();
		this.locationPlayersSubscription.unsubscribe();
		this.playerSubscription.unsubscribe();
	}
}