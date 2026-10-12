// fizzbang/practicing — practising a skill, a MUD concern, surfaced through the MUD layer.
//
// The implementation still lives in @561-group/tab (the engine) while extraction proceeds; fizzbang
// re-exports it so MUD games depend on the MUD layer, not on tab's internal script path. When the
// practice logic is moved out of tab into fizzbang, only this module changes — consumers do not.
export { default } from "@561-group/tab/practicing";
