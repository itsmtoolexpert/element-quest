"""Build the seed data files from the Element Quest prototype content.

Run from the repo root:  python3 scripts/build_seed.py
Writes api/app/seed/data/{families,elements,collections}.json.
The JSON files are committed; this script only needs re-running when the source data changes.
"""
from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "api" / "app" / "seed" / "data"

FAMILIES = {
    "ak": ("Alkali metal", "Alkali metals", "#FF595E", "Soft, shiny metals with 1 outer electron they give away easily. They react with water, some of them violently, so they never occur pure in nature."),
    "ae": ("Alkaline earth metal", "Alkaline earth", "#FF924C", "Metals with 2 outer electrons. Reactive but calmer than alkali metals, and common in rocks, shells and bones."),
    "tm": ("Transition metal", "Transition metals", "#FFCA3A", "The classic metals: strong, shiny, good conductors of heat and electricity, and often the source of bright colors in paints, gems and fireworks."),
    "pt": ("Post-transition metal", "Post-transition", "#8AC926", "Softer metals with lower melting points. Great for alloys, solder and coatings."),
    "md": ("Metalloid", "Metalloids", "#2EC4B6", "Part metal, part nonmetal. Many are semiconductors, which is why they sit inside nearly every electronic device."),
    "nm": ("Reactive nonmetal", "Nonmetals", "#1982C4", "The builders of life. They share or gain electrons to form molecules like water, sugar, proteins and DNA."),
    "hl": ("Halogen", "Halogens", "#4CC9F0", "7 outer electrons, just one short of a full shell, so they are very reactive. 'Halogen' means 'salt-former': with metals they make salts."),
    "ng": ("Noble gas", "Noble gases", "#7B61FF", "A full outer shell means they barely react with anything. They glow in bright colors when electricity passes through them."),
    "ln": ("Lanthanide", "Lanthanides", "#F15BB5", "The 'rare earth' metals. Small amounts power strong magnets, screen colors, lasers and fiber optics."),
    "ac": ("Actinide", "Actinides", "#D883FF", "All radioactive. The family includes nuclear fuels; most members are made in reactors or particle accelerators."),
    "uk": ("Superheavy (properties uncertain)", "Superheavy", "#9AA0B5", "Made a few atoms at a time in particle accelerators. They decay in seconds or less, so most of their properties are predictions."),
}

RAW = """H Hydrogen 1.008 nm|He Helium 4.0026 ng|Li Lithium 6.94 ak|Be Beryllium 9.0122 ae|B Boron 10.81 md|C Carbon 12.011 nm|N Nitrogen 14.007 nm|O Oxygen 15.999 nm|F Fluorine 18.998 hl|Ne Neon 20.180 ng|Na Sodium 22.990 ak|Mg Magnesium 24.305 ae|Al Aluminum 26.982 pt|Si Silicon 28.085 md|P Phosphorus 30.974 nm|S Sulfur 32.06 nm|Cl Chlorine 35.45 hl|Ar Argon 39.95 ng|K Potassium 39.098 ak|Ca Calcium 40.078 ae|Sc Scandium 44.956 tm|Ti Titanium 47.867 tm|V Vanadium 50.942 tm|Cr Chromium 51.996 tm|Mn Manganese 54.938 tm|Fe Iron 55.845 tm|Co Cobalt 58.933 tm|Ni Nickel 58.693 tm|Cu Copper 63.546 tm|Zn Zinc 65.38 tm|Ga Gallium 69.723 pt|Ge Germanium 72.630 md|As Arsenic 74.922 md|Se Selenium 78.971 nm|Br Bromine 79.904 hl|Kr Krypton 83.798 ng|Rb Rubidium 85.468 ak|Sr Strontium 87.62 ae|Y Yttrium 88.906 tm|Zr Zirconium 91.224 tm|Nb Niobium 92.906 tm|Mo Molybdenum 95.95 tm|Tc Technetium [98] tm|Ru Ruthenium 101.07 tm|Rh Rhodium 102.91 tm|Pd Palladium 106.42 tm|Ag Silver 107.87 tm|Cd Cadmium 112.41 tm|In Indium 114.82 pt|Sn Tin 118.71 pt|Sb Antimony 121.76 md|Te Tellurium 127.60 md|I Iodine 126.90 hl|Xe Xenon 131.29 ng|Cs Cesium 132.91 ak|Ba Barium 137.33 ae|La Lanthanum 138.91 ln|Ce Cerium 140.12 ln|Pr Praseodymium 140.91 ln|Nd Neodymium 144.24 ln|Pm Promethium [145] ln|Sm Samarium 150.36 ln|Eu Europium 151.96 ln|Gd Gadolinium 157.25 ln|Tb Terbium 158.93 ln|Dy Dysprosium 162.50 ln|Ho Holmium 164.93 ln|Er Erbium 167.26 ln|Tm Thulium 168.93 ln|Yb Ytterbium 173.05 ln|Lu Lutetium 174.97 ln|Hf Hafnium 178.49 tm|Ta Tantalum 180.95 tm|W Tungsten 183.84 tm|Re Rhenium 186.21 tm|Os Osmium 190.23 tm|Ir Iridium 192.22 tm|Pt Platinum 195.08 tm|Au Gold 196.97 tm|Hg Mercury 200.59 tm|Tl Thallium 204.38 pt|Pb Lead 207.2 pt|Bi Bismuth 208.98 pt|Po Polonium [209] pt|At Astatine [210] hl|Rn Radon [222] ng|Fr Francium [223] ak|Ra Radium [226] ae|Ac Actinium [227] ac|Th Thorium 232.04 ac|Pa Protactinium 231.04 ac|U Uranium 238.03 ac|Np Neptunium [237] ac|Pu Plutonium [244] ac|Am Americium [243] ac|Cm Curium [247] ac|Bk Berkelium [247] ac|Cf Californium [251] ac|Es Einsteinium [252] ac|Fm Fermium [257] ac|Md Mendelevium [258] ac|No Nobelium [259] ac|Lr Lawrencium [266] ac|Rf Rutherfordium [267] tm|Db Dubnium [268] tm|Sg Seaborgium [269] tm|Bh Bohrium [270] tm|Hs Hassium [269] tm|Mt Meitnerium [278] uk|Ds Darmstadtium [281] uk|Rg Roentgenium [282] uk|Cn Copernicium [285] uk|Nh Nihonium [286] uk|Fl Flerovium [289] uk|Mc Moscovium [290] uk|Lv Livermorium [293] uk|Ts Tennessine [294] uk|Og Oganesson [294] uk"""

USES = {"H":"Fuel of the Sun and stars; part of every water molecule","He":"Party balloons and cooling the giant magnets in MRI scanners","Li":"Rechargeable batteries in phones, laptops and electric cars","Be":"Lightweight, stiff parts in satellites and space telescope mirrors","B":"Heat-resistant glass cookware and the borax used to make slime","C":"Every living thing, plus pencil graphite and diamonds","N":"78% of the air you breathe; fertilizer; the gas that puffs up chip bags","O":"21% of the air; you need it to release energy from food","F":"Cavity-fighting toothpaste and nonstick frying pans","Ne":"Glowing red-orange signs","Na":"Table salt and baking soda","Mg":"Bright white sparks in fireworks and light bike frames","Al":"Soda cans, foil and airplane bodies","Si":"Computer chips, solar panels, sand and glass","P":"Match heads, fertilizer and the backbone of your DNA","S":"The smell of rotten eggs and the hardening of rubber tires","Cl":"Keeping swimming pools and tap water germ-free","Ar":"The gas inside old-style light bulbs and welding shields","K":"Bananas, potatoes and every nerve signal in your body","Ca":"Bones, teeth, milk, chalk and seashells","Sc":"Extra-strong aluminum alloys in baseball bats and bike frames","Ti":"Hip and dental implants, aircraft, and the white in paint and sunscreen","V":"Tough chrome-vanadium steel in wrenches and tools","Cr":"Shiny chrome trim and rust-proof stainless steel","Mn":"Steel making and alkaline AA batteries","Fe":"Steel buildings and the hemoglobin that carries oxygen in your blood","Co":"Deep blue glass and phone battery cathodes","Ni":"US nickels, stainless steel and rechargeable batteries","Cu":"Electrical wiring and the coating on pennies","Zn":"Rust-proof coatings on fences and white mineral sunscreen","Ga":"LEDs and compact fast phone chargers","Ge":"Fiber-optic cables and infrared night-vision lenses","As":"Infamous poison in history; high-speed chips today","Se":"Dandruff shampoo and a trace nutrient you need","Br":"Flame retardants and pool sanitizers","Kr":"Some high-speed camera flashes and insulated windows","Rb":"Ultra-precise atomic clocks","Sr":"Brilliant red fireworks","Y":"Red phosphors in old TV screens and laser crystals","Zr":"Sparkly cubic zirconia jewelry and nuclear fuel tubes","Nb":"Superconducting magnets in MRI scanners","Mo":"High-strength steel for tools and engines","Tc":"Medical scans that show how organs are working","Ru":"Hard-drive layers and tough electrical contacts","Rh":"Catalytic converters that clean car exhaust","Pd":"Catalytic converters and dental fillings","Ag":"Jewelry, mirrors and germ-fighting wound dressings","Cd":"Older rechargeable batteries and bright yellow pigments (toxic)","In":"The clear conductive layer in touchscreens","Sn":"Solder in electronics and the coating on food cans","Sb":"Flame retardants and car battery plates","Te":"Thin-film solar panels","I":"Iodized salt and antiseptic for cuts","Xe":"Bright car headlights and spacecraft ion engines","Cs":"Atomic clocks that define the second","Ba":"Green fireworks and X-ray 'barium meals'","La":"Camera lenses and hybrid car batteries","Ce":"Lighter flints and glass polishing powder","Pr":"Welders' goggles and strong magnets","Nd":"Super-strong magnets in earbuds, speakers and electric motors","Pm":"Tiny nuclear batteries; historically, glow-in-the-dark paint","Sm":"Heat-tough magnets in guitar pickups and motors","Eu":"Glowing anti-counterfeit marks on euro banknotes","Gd":"MRI contrast dye that makes scans clearer","Tb":"Green colors in screens and lamps","Dy":"Magnets in electric car motors and wind turbines","Ho":"Medical lasers and magnet pole pieces","Er":"Amplifying internet signals in fiber-optic cables","Tm":"Portable X-ray machines","Yb":"Lasers and next-generation atomic clocks","Lu":"PET scanner detectors and targeted cancer treatment","Hf":"Tiny transistors inside modern computer chips","Ta":"Small capacitors in phones and game consoles","W":"Classic light-bulb filaments and drill bits","Re":"Superalloys in jet engines","Os":"The densest element; fountain-pen nib tips","Ir":"Long-life spark plugs; the layer that marks the dinosaur-ending asteroid","Pt":"Catalytic converters and jewelry","Au":"Jewelry, medals and connectors in electronics","Hg":"Old thermometers and fluorescent lamps","Tl":"Medical heart scans; toxic in large amounts","Pb":"Car batteries and X-ray shielding aprons","Bi":"Pink stomach-relief medicine and rainbow crystals","Po":"Antistatic brushes for cleaning camera lenses","At":"Cancer-treatment research; the rarest natural element","Rn":"A radioactive gas that can build up in basements","Fr":"Lab research only; extremely rare","Ra":"Historic glow-in-the-dark watch dials","Ac":"Targeted cancer-therapy research","Th":"Old camping lantern mantles; possible future nuclear fuel","Pa":"Lab research only","U":"Fuel for nuclear power plants","Np":"Neutron detectors and research","Pu":"Power sources for Mars rovers and deep-space probes","Am":"Household smoke detectors","Cm":"Power and X-ray instruments on space probes","Bk":"Lab research only","Cf":"Starting up nuclear reactors and scanning for gold and oil"}

# symbol: (go deeper, try it / spot it, question, correct, [wrongs], explanation)
FEAT = {
"H":("About three-quarters of the normal matter in the universe is hydrogen. Inside the Sun, hydrogen nuclei smash together and fuse into helium, releasing the energy that becomes sunlight.","Every glass of water (H₂O) holds two hydrogen atoms for every oxygen atom: roughly 10²⁵ hydrogen atoms in a single glass.","What does the Sun fuse hydrogen into?","Helium",["Carbon","Oxygen","Iron"],"Fusion joins hydrogen nuclei into helium, and a little mass becomes a lot of energy (E = mc²)."),
"He":("Helium was first spotted in the Sun's light in 1868, before anyone found it on Earth. It's so light it can escape our atmosphere, so we get it from natural gas wells.","Compare a helium balloon and an air-filled one over two days. Tiny helium atoms leak through the rubber much faster.","Why does a helium balloon float?","Helium is less dense than air",["Helium is magnetic","Helium is warmer than air","Helium cancels gravity"],"Less dense gas means the balloon weighs less than the air it pushes aside, so it rises."),
"Li":("The lightest metal; it's soft enough to cut with a knife. When your phone charges, lithium ions move into one electrode, and they flow back out to power the phone.","Check the label on a phone, laptop or vape battery: it will say 'Li-ion' or 'Li-po'.","In a lithium-ion battery, what moves back and forth between the electrodes?","Lithium ions",["Photons","Water","Neutrons"],"Charged lithium atoms (ions) shuttle between electrodes as the battery charges and discharges."),
"C":("Carbon can bond to four other atoms at once and form long chains and rings, so it's the backbone of every living thing. Diamond and graphite are both pure carbon, just arranged differently.","Draw a line with a pencil. You're leaving behind layers of graphite, sheets of carbon atoms that slide off each other.","Diamond and pencil graphite are both made of...","Carbon",["Silicon","Lead","Calcium"],"Same element, different structure: diamond is a rigid 3D network, graphite is slippery stacked sheets."),
"N":("Nitrogen is 78% of air, but N₂ is so stable that plants can't use it directly. Factories turn it into ammonia fertilizer, which helps grow food for about half the world's people.","Squeeze a bag of chips: the cushion inside is nitrogen. It keeps oxygen out so the chips don't go stale.","About what percent of air is nitrogen?","78%",["21%","50%","1%"],"Nitrogen ~78%, oxygen ~21%, argon ~1%, plus a little carbon dioxide."),
"O":("Oxygen is 21% of air and about 65% of your body's mass, mostly in water. Fire needs it, and rust is iron slowly combining with it.","With an adult, cover a lit tea candle with a glass jar. The flame dies once it uses up the oxygen inside.","Which gas do your cells use to release energy from food?","Oxygen",["Nitrogen","Helium","Carbon dioxide"],"Cellular respiration uses oxygen to break down glucose; you breathe out the carbon dioxide made."),
"F":("The most reactive element of all. Fluoride in toothpaste swaps into tooth enamel and makes it harder for acids to dissolve. In nonstick pans, fluorine wraps carbon chains so food can't grip.","Read a toothpaste tube: look for sodium fluoride or stannous fluoride in the active ingredients.","Why is fluoride added to toothpaste?","It makes enamel resist acid",["It whitens teeth","It adds mint flavor","It numbs the gums"],"Fluoride forms a tougher mineral in enamel that bacterial acids struggle to dissolve."),
"Ne":("When electricity runs through neon, its electrons jump to higher energy levels, then fall back and give off red-orange light. Every element has its own light 'fingerprint'.","Many 'neon' signs in blue or green actually use other gases or coated tubes. True neon is always red-orange.","Why does neon glow inside a sign?","Excited electrons release light",["It is burning","It is radioactive","It reflects sunlight"],"Electrons absorb energy, then release it as light of colors unique to that element."),
"Na":("Pure sodium is a soft metal that fizzes violently in water. Bond it to chlorine, a toxic gas, and you get harmless table salt. Chemistry can completely change properties.","Old orange streetlights got their color from glowing sodium vapor, the same yellow-orange you see when salty water boils over onto a gas flame.","Table salt is sodium combined with...","Chlorine",["Oxygen","Carbon","Iron"],"Na + Cl → NaCl: sodium gives its outer electron to chlorine, forming ions that stick together."),
"Mg":("Magnesium burns with a dazzling white light, perfect for flares and fireworks. A magnesium atom also sits at the center of every chlorophyll molecule, which lets plants capture sunlight.","Look at a green leaf: each chlorophyll molecule inside has exactly one magnesium atom at its heart.","Which plant molecule has magnesium at its center?","Chlorophyll",["Glucose","Starch","Cellulose"],"Without magnesium, plants can't make chlorophyll; their leaves turn yellow."),
"Al":("Aluminum is the most common metal in Earth's crust, yet it was once pricier than gold because it was so hard to extract. Recycling a can uses about 95% less energy than making new metal.","Squeeze an empty can: it's light and bendy, and an invisible oxide layer stops it from rusting.","Recycling aluminum saves about how much energy compared with making it new?","About 95%",["About 10%","About 50%","None"],"Melting old cans takes far less energy than separating aluminum from its ore."),
"Si":("Second most common element in Earth's crust after oxygen. Ultra-pure silicon is a semiconductor: billions of tiny silicon transistors in your phone switch on and off to run every app.","Grab a handful of sand: much of it is silicon dioxide, the same stuff window glass is made from.","Computer chips are mostly made from...","Silicon",["Gold","Aluminum","Copper"],"Silicon can be tuned to conduct or block electricity, the on/off behind every bit."),
"Cl":("Chlorine gas is toxic, yet tiny amounts dissolved in water kill germs in pools and drinking water. It's also half of table salt.","That 'pool smell' mostly comes from chloramines, made when chlorine reacts with sweat and urine.","Why is chlorine added to swimming pools?","To kill germs",["To make water blue","To warm the water","To add minerals"],"Chlorine destroys bacteria and viruses, which is why it made tap water so much safer."),
"K":("Your nerves fire by moving potassium and sodium ions across cell membranes. Every heartbeat and every thought depends on it.","Check a sports-drink label: potassium is one of the 'electrolytes' it replaces when you sweat.","Which element do your nerve signals depend on?","Potassium",["Neon","Gold","Helium"],"Potassium ions flowing out of nerve cells help reset them after each signal."),
"Ca":("About 99% of the calcium in your body is in bones and teeth. Seashells, chalk, marble and limestone are all calcium carbonate.","Drop a piece of chalk into vinegar. The bubbles are carbon dioxide released as the acid breaks down calcium carbonate.","Seashells and chalk are mostly made of...","Calcium carbonate",["Iron oxide","Sodium chloride","Silicon dioxide"],"CaCO₃ + acid → carbon dioxide gas + water + a calcium salt."),
"Ti":("As strong as many steels but about 45% lighter, and your body doesn't reject it, so it's ideal for hip and dental implants. Titanium dioxide is the bright white in paint, toothpaste and mineral sunscreen.","Check a mineral sunscreen: titanium dioxide or zinc oxide is listed as the active ingredient.","Why is titanium used for bone implants?","It's strong, light and body-friendly",["It's magnetic","It's the cheapest metal","It dissolves over time"],"Titanium forms a stable oxide skin that bone can grow onto."),
"Fe":("Earth's core is mostly iron. In your blood, iron in hemoglobin grabs oxygen in your lungs and delivers it to every cell. Steel is iron with a little carbon.","Crush iron-fortified cereal in water inside a zip bag, then sweep a strong magnet along the bag. Tiny black iron specks gather under it.","What does iron do in your blood?","Carries oxygen",["Fights germs","Makes it salty","Clots wounds"],"Each hemoglobin molecule has four iron atoms, each able to hold an oxygen molecule."),
"Cu":("Copper conducts electricity almost as well as silver but costs far less, so it wires homes and electronics. The Statue of Liberty is copper; her green color is a protective layer that formed over decades.","Soak a dull penny in vinegar with a pinch of salt for 5 minutes. The dark copper oxide dissolves and it shines again.","Why is the Statue of Liberty green?","Copper reacted with air to form a patina",["It was painted green","Algae grows on it","It's made of jade"],"Copper slowly reacts with oxygen, CO₂ and water to form green copper carbonates."),
"Zn":("A coat of zinc protects steel from rust because zinc corrodes first, sacrificing itself. Zinc oxide sunscreen sits on your skin and blocks UV light.","Look for dull gray, crystal-patterned coatings on fences and lamp posts: that's galvanized (zinc-coated) steel.","How does a zinc coating protect steel?","Zinc corrodes first instead of the steel",["Zinc is magnetic","Zinc repels water","Zinc is harder than steel"],"Zinc gives up electrons more easily than iron, so it rusts away first."),
"Ga":("Gallium melts at 29.8 °C, below body temperature, so a chunk melts in your palm. Gallium nitride makes blue LEDs and small, cool-running fast phone chargers.","Check a phone charger box for 'GaN': that means gallium nitride inside.","What makes gallium unusual?","It melts in your hand",["It glows in the dark","It's a gas","It floats on water"],"Its melting point (29.8 °C) is lower than body temperature (37 °C)."),
"Ag":("Silver is the best electrical and thermal conductor of all elements. Silver ions kill bacteria, so it's used in wound dressings and odor-resistant sportswear.","Silver tarnishes black when it meets sulfur in air or eggs. Clean it with aluminum foil, baking soda and hot water (with an adult).","Which element is the best conductor of electricity?","Silver",["Copper","Gold","Aluminum"],"Silver beats copper slightly, but copper is used for wires because it's much cheaper."),
"Sn":("'Tin cans' are steel with a thin tin coating. Tin mixed with copper makes bronze, the alloy that gave the Bronze Age its name.","Solder that joins parts on circuit boards is mostly tin. Look closely at a circuit board's shiny silver blobs.","Bronze is copper mixed with...","Tin",["Zinc","Iron","Lead"],"Copper + tin = bronze; copper + zinc = brass."),
"I":("Your thyroid gland needs iodine to make hormones that control your metabolism. Iodized salt was introduced to prevent goiter, a swollen thyroid.","With an adult, put a drop of iodine antiseptic on a slice of potato: it turns blue-black wherever there's starch.","Which gland needs iodine to work?","Thyroid",["Liver","Pancreas","Adrenal"],"Thyroid hormones contain iodine atoms; without enough, the gland swells."),
"Nd":("Neodymium-iron-boron magnets are the strongest permanent magnets. Tiny ones make earbuds, phone vibration motors and electric car motors possible.","The magnets that hold some phone cases or laptop lids are likely neodymium. Keep them away from cards and pacemakers.","Neodymium is famous for making...","Super-strong magnets",["Glow sticks","Rocket fuel","Glass"],"A neodymium magnet can lift over 1,000 times its own weight."),
"W":("Tungsten has the highest melting point of any metal, 3,422 °C, so it was used for glowing light-bulb filaments. Its symbol W comes from its other name, wolfram.","Find an old clear incandescent bulb: the thin coil inside is tungsten.","Why is tungsten's symbol W?","From its other name, wolfram",["W stands for 'white'","It was discovered in Wales","W is for 'wire'"],"Several elements' symbols come from older or Latin names."),
"Au":("Gold barely reacts with anything, so it never rusts or tarnishes; that's why ancient gold artifacts still shine. Your phone has a little gold on its connectors for reliable contacts.","About 10,000 to 15,000 old phones together contain roughly a pound of gold. Recycling electronics recovers it.","Gold's symbol Au comes from the Latin word...","aurum",["aureate","audium","aurora"],"Aurum means 'shining dawn' in Latin."),
"Hg":("Mercury is the only metal that's liquid at room temperature. It's toxic, so mercury thermometers have mostly been replaced by digital ones. Hg comes from the Latin hydrargyrum, 'water-silver'.","If a fluorescent bulb breaks, air out the room and let an adult clean it up carefully: those bulbs contain a little mercury.","Which metal is a liquid at room temperature?","Mercury",["Gallium","Lead","Sodium"],"Mercury melts at about −39 °C. Gallium only melts at 29.8 °C."),
"Pb":("Lead is dense and soft and blocks X-rays, which is why the dentist drapes a heavy apron over you. It was removed from paint and gasoline because it harms the brain, especially in kids.","Here's a twist: pencil 'lead' has never contained lead. It's graphite, a form of carbon.","What's actually inside a 'lead' pencil?","Graphite (carbon)",["Lead","Tin","Charcoal dust and glue"],"People once thought graphite was a type of lead ore, and the name stuck."),
"U":("Splitting one uranium-235 nucleus releases tens of millions of times more energy than burning one carbon atom. Nuclear plants use that heat to boil water and spin turbines, producing about a tenth of the world's electricity.","Uranium is mildly radioactive and common in rocks; granite countertops contain trace amounts.","In a nuclear power plant, energy comes from...","Splitting uranium atoms (fission)",["Burning uranium in air","Fusing hydrogen","Chemical batteries"],"Fission splits a heavy nucleus; fusion (as in the Sun) joins light ones."),
"Am":("Most home smoke detectors hold a tiny amount of americium-241. Its radiation lets a small electric current flow through air; smoke disrupts the current and sets off the alarm.","Look at the back of a smoke alarm for 'Am-241' (don't open it). Test the alarm button monthly.","How does americium help a smoke detector work?","Its radiation lets current flow until smoke blocks it",["It glows when smoke arrives","It smells smoke","It heats up near fire"],"Ionization detectors sense the drop in current when smoke particles enter the chamber."),
}

LATIN = {"Na":"natrium","K":"kalium","Fe":"ferrum","Cu":"cuprum","Ag":"argentum","Au":"aurum","Sn":"stannum","Pb":"plumbum","Hg":"hydrargyrum","W":"wolfram","Sb":"stibium"}

COLLECTIONS = [
    ("phone", "Your phone", ["Li","Co","Si","Cu","Au","Ag","In","Ta","Nd","Al","Sn","Ga","Pd","Hf","Tb","Dy"], "A smartphone holds dozens of elements: lithium and cobalt in the battery, silicon chips, indium in the touchscreen, neodymium in the speakers."),
    ("kitchen", "Kitchen", ["Na","Cl","Fe","Al","C","O","H","K","Ca","I","Cu","Sn","F","N"], "Salt, foil, cast-iron pans, copper pots and even the water from the tap are all chemistry."),
    ("body", "Your body", ["O","C","H","N","Ca","P","K","S","Na","Cl","Mg","Fe","Zn","I","Cu","Se"], "Just four elements, oxygen, carbon, hydrogen and nitrogen, make up about 96% of your body's mass."),
    ("fireworks", "Fireworks", ["Sr","Ba","Cu","Na","Li","Mg","Al","K","S","C","Ca","Ti"], "Each color is an element's light fingerprint: strontium red, barium green, copper blue, sodium yellow."),
    ("space", "Space & rockets", ["H","He","O","Ti","Be","Pu","Xe","Al","Cm","N"], "Hydrogen and oxygen fuel rockets, xenon pushes ion engines, plutonium powers rovers far from the Sun."),
    ("hospital", "Hospital", ["Tc","Gd","Ba","I","Ti","He","Nb","Lu","Pb","O","Ag"], "MRI magnets cooled by helium, X-ray aprons made with lead, and radioactive tracers that light up organs."),
]

GAS = {"H","He","N","O","F","Ne","Cl","Ar","Kr","Xe","Rn"}
LIQ = {"Br","Hg"}

# --- positions -------------------------------------------------------------
def position(z: int) -> tuple[int | None, int]:
    if z == 1: return 1, 1
    if z == 2: return 18, 1
    if z <= 10:
        i = z - 3; return (i + 1 if i < 2 else i + 11), 2
    if z <= 18:
        i = z - 11; return (i + 1 if i < 2 else i + 11), 3
    if z <= 36: return z - 18, 4
    if z <= 54: return z - 36, 5
    if z <= 56: return z - 54, 6
    if z <= 71: return None, 6
    if z <= 86: return z - 68, 6
    if z <= 88: return z - 86, 7
    if z <= 103: return None, 7
    return z - 100, 7

def block(z: int, group: int | None) -> str:
    if group is None: return "f"
    if z == 2: return "s"
    if group <= 2: return "s"
    if group >= 13: return "p"
    return "d"

# --- electron configuration (same rules as the prototype) ----------------
ORB = [(1,0),(2,0),(2,1),(3,0),(3,1),(4,0),(3,2),(4,1),(5,0),(4,2),(5,1),(6,0),(4,3),(5,2),(6,1),(7,0),(5,3),(6,2),(7,1)]
CAP = [2, 6, 10, 14]
LL = "spdf"
EXC = {24:"3d5 4s1",29:"3d10 4s1",41:"4d4 5s1",42:"4d5 5s1",44:"4d7 5s1",45:"4d8 5s1",46:"4d10",47:"4d10 5s1",57:"5d1 6s2",58:"4f1 5d1 6s2",64:"4f7 5d1 6s2",78:"4f14 5d9 6s1",79:"4f14 5d10 6s1",89:"6d1 7s2",90:"6d2 7s2",91:"5f2 6d1 7s2",92:"5f3 6d1 7s2",93:"5f4 6d1 7s2",96:"5f7 6d1 7s2",103:"5f14 7s2 7p1"}
NOBLE = [2, 10, 18, 36, 54, 86]
SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹"

def aufbau(z: int) -> dict[str, int]:
    m: dict[str, int] = {}
    r = z
    for n, l in ORB:
        if r <= 0: break
        c = min(CAP[l], r)
        m[f"{n}{LL[l]}"] = c
        r -= c
    return m

def core_of(z: int) -> int:
    c = 0
    for n in NOBLE:
        if n < z: c = n
    return c

def full(z: int) -> dict[str, int]:
    if z in EXC:
        m = aufbau(core_of(z))
        for t in EXC[z].split():
            m[t[:2]] = int(t[2:])
        return m
    return aufbau(z)

def okey(k: str) -> int:
    return int(k[0]) * 10 + LL.index(k[1])

def sup(n: int) -> str:
    return "".join(SUP[int(d)] for d in str(n))

def config_str(z: int, symbols: list[str]) -> str:
    f = full(z); c = core_of(z); cm = aufbau(c) if c else {}
    keys = sorted((k for k in f if k not in cm), key=okey)
    core = f"[{symbols[c-1]}] " if c else ""
    return core + " ".join(k + sup(f[k]) for k in keys) + (" (predicted)" if z > 103 else "")

def shells(z: int) -> list[int]:
    out: dict[int, int] = {}
    for k, v in full(z).items():
        out[int(k[0])] = out.get(int(k[0]), 0) + v
    return [out.get(i, 0) for i in range(1, max(out) + 1)]

def valence(z: int, group: int | None) -> int | None:
    if z == 2: return 2
    if z > 86 or group is None: return None
    if group <= 2: return group
    if group >= 13: return group - 10
    return None  # transition metals: varies

def state(z: int, sym: str) -> str:
    if z >= 104: return "Unknown"
    if sym in GAS: return "Gas"
    if sym in LIQ: return "Liquid"
    return "Solid"

# --- materials ("What's inside") -----------------------------------------
import re

def parse_group(s: str) -> dict[str, float]:
    stack: list[dict[str, float]] = [{}]
    i = 0
    while i < len(s):
        ch = s[i]
        if ch == "(":
            stack.append({}); i += 1
        elif ch == ")":
            i += 1
            n = ""
            while i < len(s) and (s[i].isdigit() or s[i] == "."):
                n += s[i]; i += 1
            g = stack.pop(); mul = float(n) if n else 1.0
            for k, v in g.items():
                stack[-1][k] = stack[-1].get(k, 0) + v * mul
        else:
            m = re.match(r"([A-Z][a-z]?)(\d*\.?\d*)", s[i:])
            if not m or not m.group(1):
                raise ValueError(f"bad formula near {s[i:]!r}")
            stack[-1][m.group(1)] = stack[-1].get(m.group(1), 0) + (float(m.group(2)) if m.group(2) else 1.0)
            i += len(m.group(0))
    return stack[0]

def parse_formula(f: str) -> dict[str, float]:
    total: dict[str, float] = {}
    for part in re.split(r"[·*](?=\d*[A-Z(])", f.replace(" ", "")):
        m = re.match(r"^(\d*\.?\d+)?(.*)$", part)
        mul = float(m.group(1)) if m.group(1) else 1.0
        for k, v in parse_group(m.group(2)).items():
            total[k] = total.get(k, 0) + v * mul
    return total

def mass_composition(atoms: dict[str, float], masses: dict[str, float]) -> dict[str, float]:
    w = {s: n * masses[s] for s, n in atoms.items()}
    t = sum(w.values())
    return {s: round(v / t * 100, 4) for s, v in sorted(w.items(), key=lambda kv: -kv[1])}

def build_materials(masses: dict[str, float]) -> list[dict]:
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from materials_source import FEATURED_MATERIALS, MATERIALS

    out = []
    for m in MATERIALS:
        aliases = [a.strip().lower() for a in m["a"].split(",") if a.strip()]
        if "f" in m:
            atoms = parse_formula(m["f"])
            comp = mass_composition(atoms, masses)
            kind = "element" if len(atoms) == 1 else "compound"
            atoms_out = {k: (int(v) if v == int(v) else v) for k, v in atoms.items()}
        else:
            for s in m["m"]:
                assert s in masses, (m["n"], s)
            comp = dict(sorted(m["m"].items(), key=lambda kv: -kv[1]))
            kind, atoms_out = "mixture", None
        out.append({"name": m["n"], "aliases": aliases, "formula": m.get("f"), "kind": kind,
                    "composition": comp, "atoms": atoms_out, "note": m["t"], "source": m.get("src"),
                    "featured": m["n"] in FEATURED_MATERIALS})
    assert len({o["name"] for o in out}) == len(out), "duplicate material names"
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = [s.split(" ") for s in RAW.split("|")]
    assert len(rows) == 118
    symbols = [r[0] for r in rows]
    elements = []
    for i, (sym, name, mass, cat) in enumerate(rows):
        z = i + 1
        g, p = position(z)
        radioactive = z in (43, 61) or z >= 84
        feat = FEAT.get(sym)
        use = USES.get(sym) or ("Lab research only; made a few atoms at a time" if z <= 103 else "Made in particle accelerators; lasts only a split second")
        elements.append({
            "number": z, "symbol": sym, "name": name,
            "mass": mass.strip("[]"), "mass_is_estimate": mass.startswith("["),
            "family": cat, "group": g, "period": p, "block": block(z, g),
            "state": state(z, sym), "radioactive": radioactive,
            "electron_config": config_str(z, symbols), "shells": shells(z),
            "valence_electrons": valence(z, g), "latin_name": LATIN.get(sym),
            "content": {
                "everyday_use": use,
                "go_deeper": feat[0] if feat else None,
                "try_it": feat[1] if feat else None,
                "featured": bool(feat),
                "check_question": {"question": feat[2], "correct": feat[3], "wrong": feat[4], "explanation": feat[5]} if feat else None,
            },
        })
    families = [{"code": k, "name": v[0], "short_name": v[1], "color": v[2], "description": v[3]} for k, v in FAMILIES.items()]
    collections = [{"slug": s, "label": l, "symbols": e, "note": n} for s, l, e, n in COLLECTIONS]
    masses = {r[0]: float(r[2].strip("[]")) for r in rows}
    materials = build_materials(masses)
    for name, data in (("families", families), ("elements", elements), ("collections", collections), ("materials", materials)):
        (OUT / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {len(families)} families, {len(elements)} elements, {len(collections)} collections, "
          f"{len(materials)} materials to {OUT}")

if __name__ == "__main__":
    main()
