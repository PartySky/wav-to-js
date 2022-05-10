import {Period} from "./period";

export interface Note {
  start: number;
  end?: number;
  length: number;
  periods: Period[];
}
