// @561-group/fizzos — the MUD driver over @561-group/tab (TAB), an homage to FluffOS.
//
// Layering:  @561-group/computer (OS)  ->  @561-group/tab (generic game engine)  ->  fizzbang (MUD)
//            ->  a MUD game (e.g. @561-group/ruinfold).
//
// tab owns the engine-general concerns (the EAVT world-substrate, ticking, value/charge, trade,
// worldgen, ecology, history, federation). fizzbang owns the concerns that are specific to MUDs —
// practising skills, socialising, saying/mailing, factions, fighting, crafting — so a MUD game
// depends on this layer instead of reaching into tab's internals. Modules migrate here from tab
// incrementally; subpaths re-export the tab implementation until each is physically moved.
export { default as practice } from "./mud/practicing.mjs";
