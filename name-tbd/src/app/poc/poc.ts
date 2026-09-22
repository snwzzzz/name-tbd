import { Component } from '@angular/core';
import { ComponentList } from "../component-list/component-list";

@Component({
  selector: 'app-poc',
  imports: [ComponentList],
  templateUrl: './poc.html',
  styleUrl: './poc.scss',
})
export class Poc {}
