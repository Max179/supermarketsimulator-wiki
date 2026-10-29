#!/usr/bin/env python3
"""Extract the game images we can MAP to a player-facing entity, and record the mapping.

Only assets listed in MAPPINGS are exported. Each export records the source bundle, the asset name, the sha256 of the
written file and its dimensions, so a published entry can point at an image whose origin is checkable. Anything not
listed here must stay an original diagram, clearly labelled as such.
"""
import os, json, hashlib
import UnityPy

ROOT = r'C:/uTorria/Downloads/Supermarket Simulator (2025)/Supermarket Simulator/Supermarket Simulator_Data'
OUT_DIR = os.path.join('content', 'assets', 'mapped')
MANIFEST = os.path.join('content', 'images-manifest.json')
MAPPINGS = [
    {'entity': 'products-and-deliveries', 'bundle': 'resources.assets', 'match': 'T_Egg_BCA', 'file': 'products-and-deliveries-egg.png', 'note': 'the colour texture the game ships for an egg product the entry describes'},
    {'entity': 'products-and-deliveries', 'bundle': 'resources.assets', 'match': 'T_Sauce_BCA',
     'file': 'products-and-deliveries-sauce.png', 'note': 'the colour texture the game ships for a sauce product the entry describes'},
    {'entity': 'restocking-shelves', 'bundle': 'resources.assets', 'match': 'T_FurnituresShelf_BCA',
     'file': 'restocking-shelves-shelf.png', 'note': 'albedo texture of the shop shelving the entry describes'},
    {'entity': 'checkout-and-cashiers', 'bundle': 'resources.assets', 'match': 'T_SelfCheckout_alb',
     'file': 'checkout-and-cashiers-selfcheckout.png', 'note': 'albedo texture of the self-checkout machine the entry cites'},
    {'entity': 'storage-crates-and-the-storage-tab', 'bundle': 'resources.assets', 'match': "T_CardboardBox_greengrocer's_AlbedoTransparency",
     'file': 'storage-crates-and-the-storage-tab-box.png', 'note': 'albedo texture of the cardboard box used for stock'},
    {'entity': 'floors-and-floor-painting', 'bundle': 'sharedassets2.assets', 'match': 'T_IconAtlas_FloorTextures',
     'file': 'floors-and-floor-painting-atlas.jpg', 'note': "the game's own icon atlas of the floor textures you can apply",
     'max': 1024, 'quality': 82},
    {'entity': 'floors-and-floor-painting', 'bundle': 'sharedassets2.assets', 'match': 'T_ceramic_tiles_alb',
     'file': 'floors-and-floor-painting-tiles.jpg', 'note': 'albedo of one of the tile floor textures the game ships',
     'max': 1024, 'quality': 80},
    {'entity': 'furniture-and-shop-layout', 'bundle': 'sharedassets2.assets', 'match': 'T_IconAtlas_Furnitures',
     'file': 'furniture-and-shop-layout-atlas.jpg', 'note': "the game's own icon atlas of the furniture it offers",
     'max': 1024, 'quality': 82},
    {'entity': 'vending-machines', 'bundle': 'resources.assets', 'match': 'T_VendingMachine_BCA',
     'file': 'vending-machines-machine.jpg', 'note': 'albedo texture of the vending machine fixture the entry describes',
     'max': 1024, 'quality': 84},
    {'entity': 'shoplifters-in-your-shop', 'bundle': 'resources.assets', 'match': 'T_ThiefDetector_AlbedoTransparency',
     'file': 'shoplifters-in-your-shop-detector.jpg', 'note': 'albedo texture of the shop door detector the game uses against shoplifters',
     'max': 1024, 'quality': 84},
    {'entity': 'shelf-slots-and-display-space', 'bundle': 'sharedassets2.assets', 'match': 'T_IceCream_Display',
     'file': 'shelf-slots-and-display-space-icecream.jpg', 'note': 'texture of a display case built for a particular product, the kind of display slot the entry describes',
     'max': 1024, 'quality': 84},
    {'entity': 'painting-the-walls', 'bundle': 'sharedassets2.assets', 'match': 'T_IconAtlas_PaintBuckets',
     'file': 'painting-the-walls-buckets.jpg', 'note': "the game's own icon atlas of the paint buckets you use on walls",
     'max': 1024, 'quality': 82},
    {'entity': 'the-weighing-scale', 'bundle': 'resources.assets', 'match': 'T_Digitalscale_AlbedoTransparency',
     'file': 'the-weighing-scale-scale.jpg', 'note': 'albedo texture of the digital scale the entry describes',
     'max': 1024, 'quality': 84},
    {'entity': 'the-weighing-scale', 'bundle': 'sharedassets2.assets', 'match': "VeggiesScreen",
     'file': 'the-weighing-scale-produce-screen.jpg', 'note': "the game's own picture for the produce side of weighing, a fruit-and-vegetable stand beside a checkout scale",
     'max': 1024, 'quality': 86},
    {'entity': 'cleanliness-and-standing', 'bundle': 'resources.assets', 'match': "T_Mop_AlbedoTransparency", 'file': 'cleanliness-and-standing-mop.jpg', 'note': "albedo texture of the mop the game supplies for cleaning", 'max': 1024, 'quality': 84},
    {'entity': 'customers-and-helpers', 'bundle': 'resources.assets', 'match': "Customers_03_Skin_Dif", 'file': 'customers-and-helpers-customer.jpg', 'note': "a diffuse texture belonging to one of the game customer characters", 'max': 1024, 'quality': 84},
    {'entity': 'dirt-and-cleaning', 'bundle': 'resources.assets', 'match': "T_Dirt_Alb", 'file': 'dirt-and-cleaning-dirt.jpg', 'note': "albedo texture of the dirt the game lays down in the shop", 'max': 1024, 'quality': 84},
    {'entity': 'how-customers-find-their-way', 'bundle': 'sharedassets2.assets', 'match': "T_ Walk Lane Sign_BaseColor", 'file': 'how-customers-find-their-way-sign.jpg', 'note': "the base colour texture of the walk lane sign the game uses to direct customers", 'max': 1024, 'quality': 84},
    {'entity': 'how-products-are-displayed', 'bundle': 'resources.assets', 'match': "T_PegDisplay_BCA", 'file': 'how-products-are-displayed-pegboard.jpg', 'note': "albedo texture of the pegboard display the game offers for hanging goods", 'max': 1024, 'quality': 84},
    {'entity': 'loans-and-paying-them-back', 'bundle': 'sharedassets2.assets', 'match': "T_Grocery&Bank_AlbedoTransparency", 'file': 'loans-and-paying-them-back-bank.jpg', 'note': "albedo texture of the bank building the shop borrows from", 'max': 1024, 'quality': 84},
    {'entity': 'orders-and-what-you-can-order', 'bundle': 'resources.assets', 'match': "T_Onlineorder_Alb", 'file': 'orders-and-what-you-can-order-online.jpg', 'note': "albedo texture of the online order station the entry describes", 'max': 1024, 'quality': 84},
    {'entity': 'paying-by-card-or-cash', 'bundle': 'resources.assets', 'match': "T_Cashregister_AlbedoTransparency", 'file': 'paying-by-card-or-cash-register.jpg', 'note': "albedo texture of the shop cash register that takes payment", 'max': 1024, 'quality': 84},
    {'entity': 'signs-labels-and-organising', 'bundle': 'resources.assets', 'match': "T_CategorySign_AlbedoTransparency", 'file': 'signs-labels-and-organising-categorysign.jpg', 'note': "albedo texture of the category sign the entry describes", 'max': 1024, 'quality': 84},
    {'entity': 'storage-sections-and-sorting', 'bundle': 'resources.assets', 'match': "T_Rack_BCA", 'file': 'storage-sections-and-sorting-rack.jpg', 'note': "albedo texture of the storage rack the back room is built from", 'max': 1024, 'quality': 84},
    {'entity': 'the-racks-the-back-room-uses', 'bundle': 'sharedassets2.assets', 'match': "Tall Rack", 'file': 'the-racks-the-back-room-uses-tall-rack.jpg', 'note': "the game's own artwork for a tall rack of the kind the back room uses", 'max': 512, 'quality': 88},
    {'entity': 'the-popups-in-the-game', 'bundle': 'sharedassets3.assets', 'match': "Icon_ImageIcon_Info", 'file': 'the-popups-in-the-game-info.png', 'note': "the information icon the game itself draws on a popup"},
    {'entity': 'the-display-behind-the-shelf', 'bundle': 'sharedassets2.assets', 'match': "Display_AlbedoTransparency", 'file': 'the-display-behind-the-shelf-display.jpg', 'note': "the colour texture the game ships for the display a shelf is built around", 'max': 1024, 'quality': 84},
    {'entity': 'the-devices-the-game-can-shake', 'bundle': 'sharedassets2.assets', 'match': "icon_controller_152", 'file': 'the-devices-the-game-can-shake-controller.png', 'note': "the game controller icon the game itself ships"},
    {'entity': 'bills-loans-and-growth-screens', 'bundle': 'resources.assets', 'match': "US10dollarbill-Series_2004A", 'file': 'bills-loans-and-growth-screens-bill.jpg', 'note': "the banknote texture the game ships for the money its bills are about", 'max': 1024, 'quality': 84},
    {'entity': 'save-slots-and-what-each-one-holds', 'bundle': 'sharedassets2.assets', 'match': "Diskora_FlashDrive", 'file': 'save-slots-and-what-each-one-holds-flashdrive.jpg', 'note': "the game's own texture for the flash drive a save is written to", 'max': 512, 'quality': 88},
    {'entity': 'restock-areas-and-vehicles', 'bundle': 'sharedassets2.assets', 'match': "T_Sedanicon", 'file': 'restock-areas-and-vehicles-sedan.jpg', 'note': "the game's own icon for one of the vehicles that carries stock", 'max': 256, 'quality': 92},
    {'entity': 'the-notebook-your-orders-are-written-in', 'bundle': 'sharedassets2.assets', 'match': "T_OnlineOrder_icon", 'file': 'the-notebook-your-orders-are-written-in-order.jpg', 'note': "the order icon the game itself draws for an online order", 'max': 256, 'quality': 92},
    {'entity': 'shoplifters-in-your-shop', 'bundle': 'resources.assets', 'match': "T_Icon_Thief", 'file': 'shoplifters-in-your-shop-thief.jpg', 'note': "the game's own icon for a shoplifter", 'max': 512, 'quality': 88},
    {'entity': 'how-your-shop-is-saved', 'bundle': 'sharedassets2.assets', 'match': "Diskora_FlashDrive", 'file': 'how-your-shop-is-saved-flashdrive.jpg', 'note': "the game's own texture for the flash drive a shop is written to", 'max': 512, 'quality': 88},
    {'entity': 'security-cameras-and-guards', 'bundle': 'sharedassets2.assets', 'match': "T_Icon_ThiefDetector", 'file': 'security-cameras-and-guards-detector.jpg', 'note': "the game's own icon for the door detector that works with the shop's security", 'max': 512, 'quality': 88},
    {'entity': 'the-street-outside', 'bundle': 'sharedassets2.assets', 'match': "TX_Gas_Station_Sign_02a_ALB", 'file': 'the-street-outside-gassign.jpg', 'note': "the game's own albedo texture for the petrol station sign on the street", 'max': 512, 'quality': 88},
    {'entity': 'the-till-and-its-screens', 'bundle': 'sharedassets2.assets', 'match': "Take money back", 'file': 'the-till-and-its-screens-take-money-back.jpg', 'note': "the screen texture the game uses for taking money back at the till", 'max': 1024, 'quality': 84},
    {'entity': 'store-upgrades-and-licences', 'bundle': 'resources.assets', 'match': "T_license_A", 'file': 'store-upgrades-and-licences-licence.jpg', 'note': "the game own licence artwork used for the licences the entry describes", 'max': 1024, 'quality': 84},
    {'entity': 'the-local-market-and-product-costs', 'bundle': 'sharedassets2.assets', 'match': "T_LocalMarket Display_GreenMarket", 'file': 'the-local-market-and-product-costs-market.jpg', 'note': "texture of a local market display stand the entry describes", 'max': 1024, 'quality': 84},
    {'entity': 'the-storage-lights-and-door', 'bundle': 'sharedassets2.assets', 'match': "T_Door_Var_AlbedoTransparency", 'file': 'the-storage-lights-and-door-door.jpg', 'note': "albedo texture of a door of the kind the storage area uses", 'max': 1024, 'quality': 84},
    {'entity': 'who-keeps-the-shop-clean', 'bundle': 'sharedassets2.assets', 'match': "Janitor_Icon", 'file': 'who-keeps-the-shop-clean-janitor.jpg', 'note': "the icon the game itself uses for the staff who keep the shop clean", 'max': 1024, 'quality': 84},
    {'entity': 'repaying-a-loan-payment-by-payment', 'bundle': 'sharedassets2.assets', 'match': "CreditCard", 'file': 'repaying-a-loan-payment-by-payment-card.jpg', 'note': "the game own credit card artwork used for borrowing", 'max': 1024, 'quality': 84},
    {'entity': 'raising-your-storage-and-shop-level', 'bundle': 'resources.assets', 'match': "WareHouse_icon", 'file': 'raising-your-storage-and-shop-level-warehouse.jpg', 'note': "the icon the game itself uses for the storage you buy", 'max': 1024, 'quality': 84},
    {'entity': 'what-your-shop-spends', 'bundle': 'resources.assets', 'match': "T_Money_AlbedoTransparency", 'file': 'what-your-shop-spends-money.jpg', 'note': "albedo texture of the money the shop spends", 'max': 1024, 'quality': 84},
    {'entity': 'the-shop-computer', 'bundle': 'sharedassets2.assets', 'match': "T_SuperMarketComputer_AlbedoTransparency", 'file': 'the-shop-computer-computer.jpg', 'note': "albedo texture of the shop computer the ordering screens run on", 'max': 1024, 'quality': 84},
    {'entity': 'the-bakery-counter', 'bundle': 'resources.assets', 'match': "T_BakeryDlc_Display_BCA", 'file': 'the-bakery-counter-display.jpg', 'note': "albedo texture of the bakery display the bread is sold from", 'max': 1024, 'quality': 84},
    {'entity': 'the-oven-and-the-baker', 'bundle': 'sharedassets2.assets', 'match': "T_Bakery-Oven", 'file': 'the-oven-and-the-baker-oven.jpg', 'note': "the game's own picture of the bakery oven the worker loads", 'max': 512, 'quality': 88},
    {'entity': 'the-oven-and-the-baker', 'bundle': 'sharedassets2.assets', 'match': "T_Frozen_Bread", 'file': 'the-oven-and-the-baker-frozen-bread.jpg', 'note': "the frozen bread the bakery starts from before it goes into the oven", 'max': 512, 'quality': 88},
    {'entity': 'the-rubbish-and-where-it-goes', 'bundle': 'sharedassets2.assets', 'match': "Trashcan", 'file': 'the-rubbish-and-where-it-goes-bin.jpg', 'note': "the game's own picture of the wheeled bin the shop's rubbish goes in", 'max': 512, 'quality': 88},
    {'entity': 'the-rubbish-and-where-it-goes', 'bundle': 'sharedassets2.assets', 'match': "T_GarbageBags_Icons", 'file': 'the-rubbish-and-where-it-goes-bags.jpg', 'note': "the game's own picture of the box of waste bags the shop uses", 'max': 512, 'quality': 88},
    {'entity': 'watching-your-vending-machines', 'bundle': 'sharedassets2.assets', 'match': "T_VendingMachine", 'file': 'watching-your-vending-machines-machine.jpg', 'note': "the game's own colour texture for the vending machine the tracker keeps an eye on", 'max': 512, 'quality': 88},
    {'entity': 'watching-your-vending-machines', 'bundle': 'sharedassets2.assets', 'match': "T_Vending_ComputerIcon", 'file': 'watching-your-vending-machines-computer-icon.jpg', 'note': "the game's own icon for vending machine computer screens", 'max': 512, 'quality': 88},
    {'entity': 'the-till-and-its-monitor', 'bundle': 'resources.assets', 'match': "Cash_Register_Monitor_Diffuse", 'file': 'the-till-and-its-monitor-screen.jpg', 'note': "the game's own picture of the checkout register's monitor", 'max': 512, 'quality': 88},
    {'entity': 'the-list-you-buy-from', 'bundle': 'sharedassets2.assets', 'match': "Box Icon", 'file': 'the-list-you-buy-from-box.jpg', 'note': "the game's own icon for an item in the list you buy from", 'max': 512, 'quality': 88},
    {'entity': 'the-computer-and-the-tablet', 'bundle': 'sharedassets2.assets', 'match': "T_Tablet_AlbedoTransparency", 'file': 'the-computer-and-the-tablet-tablet.jpg', 'note': "the game's own texture for its tablet device", 'max': 512, 'quality': 88},
    {'entity': 'the-computer-and-the-tablet', 'bundle': 'sharedassets2.assets', 'match': "TabletScannerIcon", 'file': 'the-computer-and-the-tablet-scanner-icon.jpg', 'note': "the icon the tablet uses for scanning", 'max': 512, 'quality': 88},
    {'entity': 'the-self-checkout-and-its-rules', 'bundle': 'sharedassets2.assets', 'match': "Self Checkout", 'file': 'the-self-checkout-and-its-rules-machine.jpg', 'note': "the game's own picture of the self-service checkout machine", 'max': 512, 'quality': 88},
    {'entity': 'category-signs-and-the-categories-behind-them', 'bundle': 'sharedassets2.assets', 'match': "Sign4_Dairy", 'file': 'category-signs-and-the-categories-behind-them-sign.jpg', 'note': "one of the category signs the game ships for the shop's shelves", 'max': 256, 'quality': 90},
    {'entity': 'the-shop-entrance', 'bundle': 'sharedassets2.assets', 'match': "T_StoreEntrance_Trim_AlbedoTransparency", 'file': 'the-shop-entrance-trim.jpg', 'note': "the albedo texture of the trim on the shop entrance variants", 'max': 1024, 'quality': 84},
    {'entity': 'the-vehicles-you-can-use', 'bundle': 'resources.assets', 'match': "T_Sedan_glass_AlbedoTransparency", 'file': 'the-vehicles-you-can-use-car.jpg', 'note': "a glass texture belonging to one of the vehicles the game ships", 'max': 512, 'quality': 88},
    {'entity': 'the-crates-you-buy', 'bundle': 'resources.assets', 'match': "M_VegieCrate_AlbedoTransparency", 'file': 'the-crates-you-buy-crate.jpg', 'note': "the albedo texture of one of the crates the game ships", 'max': 512, 'quality': 88},
    {'entity': 'music-in-your-shop', 'bundle': 'resources.assets', 'match': "T_speaker_alb", 'file': 'music-in-your-shop-speaker.jpg', 'note': "the albedo texture of the speaker the game ships for shop music", 'max': 512, 'quality': 88},
    {'entity': 'the-street-outside', 'bundle': 'resources.assets', 'match': "T_Gas_Icon", 'file': 'the-street-outside-gas.jpg', 'note': "the icon the game itself uses for the petrol station on the street", 'max': 512, 'quality': 90},
    {'entity': 'who-comes-into-the-shop', 'bundle': 'sharedassets2.assets', 'match': "Man_01_Cloth_Albedo", 'file': 'who-comes-into-the-shop-cloth.jpg', 'note': "the cloth texture the game ships for one of the customer characters it generates", 'max': 512, 'quality': 88},
    {'entity': 'how-the-game-shows-what-you-can-use', 'bundle': 'resources.assets', 'match': "T_Crosshair_Icons", 'file': 'how-the-game-shows-what-you-can-use-crosshair.jpg', 'note': "the icon sheet the game itself uses for its crosshair and interaction prompts", 'max': 1024, 'quality': 84},
    {'entity': 'the-global-map-and-its-markers', 'bundle': 'sharedassets2.assets', 'match': "T_Mappins_Vending_V2_Icon", 'file': 'the-global-map-and-its-markers-pin.jpg', 'note': "one of the map icons the game itself uses on its map", 'max': 512, 'quality': 90},
    {'entity': 'wholesale-offers-and-discounts', 'bundle': 'sharedassets2.assets', 'match': "T_Wholesaleoffer_icon", 'file': 'wholesale-offers-and-discounts-icon.jpg', 'note': "the icon the game itself uses for a wholesale offer", 'max': 1024, 'quality': 84},
    {'entity': 'serving-ice-cream', 'bundle': 'sharedassets2.assets', 'match': "T_DLC_IceCream_Bucket_BCA", 'file': 'serving-ice-cream-bucket.jpg', 'note': "albedo texture of the ice cream bucket the scoops come out of", 'max': 1024, 'quality': 84},
    {'entity': 'the-janitor', 'bundle': 'sharedassets2.assets', 'match': "Janitor_Icon", 'type': 'Sprite', 'file': 'the-janitor-icon.png', 'note': "the icon the game itself uses for the janitor, the worker this entry describes", 'max': 512},
    {'entity': 'the-expansion-packs', 'bundle': 'sharedassets1.assets', 'match': "electronicsIcon", 'type': 'Sprite', 'file': 'the-expansion-packs-electronics.png', 'note': "the game's own banner for its electronics pack, shown in the shop's pack list"},
    {'entity': 'the-expansion-packs', 'bundle': 'sharedassets1.assets', 'match': "clothingIcon", 'type': 'Sprite', 'file': 'the-expansion-packs-clothing.png', 'note': "the game's own banner for its clothing pack, shown in the shop's pack list"},
    # Reviewed by eye: white icons on a transparent field. Flattened onto white the sheet looks blank, which is a
    # trap for a viewer that ignores alpha; composited on the dark background this site draws pictures on, the four
    # icons (engine, ABS, brake warning, skidding car) are legible. See reports/image-reviews.md.
    {'entity': 'inside-a-vehicle', 'bundle': 'resources.assets', 'match': "DashBoardIcons", 'file': 'inside-a-vehicle-dashboard.png', 'note': "the dashboard warning icons the game ships for its vehicles", 'max': 512},
    {'entity': 'the-aim-and-its-settings', 'bundle': 'resources.assets', 'match': "T_Crosshair_Icons", 'file': 'the-aim-and-its-settings-crosshairs.jpg', 'note': "the crosshair shapes the game draws, taken from the same icon sheet its interaction prompts use", 'max': 1024, 'quality': 84},
    {'entity': 'the-warnings-the-game-shows', 'bundle': 'sharedassets2.assets', 'match': "dirtiness arrow warning", 'file': 'the-warnings-the-game-shows-cleaning.jpg', 'note': "the game's own warning screen about a dirty shop, showing the tool wheel and the dirtiness indicator", 'max': 1024, 'quality': 84},
    {'entity': 'the-warnings-the-game-shows', 'bundle': 'sharedassets2.assets', 'match': "SecurityWarningScreen", 'file': 'the-warnings-the-game-shows-security.jpg', 'note': "the game's own warning screen about shop security, showing the gate, the camera and the guard", 'max': 1024, 'quality': 84},
    {'entity': 'barcodes-and-the-scanner', 'bundle': 'resources.assets', 'match': "Barcode", 'file': 'barcodes-and-the-scanner-plain.jpg', 'note': "the barcode picture the game spawns for a product at the till", 'max': 512, 'quality': 92},
    {'entity': 'barcodes-and-the-scanner', 'bundle': 'resources.assets', 'match': "BarcodeDiscounted", 'file': 'barcodes-and-the-scanner-discounted.jpg', 'note': "the second barcode picture the game ships for discounted goods", 'max': 512, 'quality': 92},
    {'entity': 'the-lights-and-the-switches', 'bundle': 'sharedassets2.assets', 'match': "Toggle_Switch_Off_Handle", 'file': 'the-lights-and-the-switches-handle.png', 'note': "the handle the game draws for a switch in its off position", 'max': 96},
    # Reviewed by eye and dropped: Toggle_Switch_Off_Frame exports as a flat purple disc with no structure of
    # its own; the handle above is the picture that shows a reader what the switch looks like.
    {'entity': 'licence-items-and-their-icons', 'bundle': 'sharedassets2.assets', 'match': "T_IconAtlasLicence-1-10", 'file': 'licence-items-and-their-icons-sheet.jpg', 'note': "the game's own icon sheet for its first ten product licences", 'max': 1024, 'quality': 84},
    {'entity': 'licence-items-and-their-icons', 'bundle': 'sharedassets2.assets', 'match': "T_IconAtlasLicence-Vegetables", 'file': 'licence-items-and-their-icons-vegetables.jpg', 'note': "the game's own icon sheet for its vegetable licences", 'max': 1024, 'quality': 84},
    {'entity': 'playing-with-a-controller', 'bundle': 'resources.assets', 'match': "XboxOne_A", 'file': 'playing-with-a-controller-button-a.png', 'note': "one of the controller button pictures the game ships for its prompts", 'max': 128},
    {'entity': 'playing-with-a-controller', 'bundle': 'resources.assets', 'match': "XboxOne_B", 'file': 'playing-with-a-controller-button-b.png', 'note': "another of the controller button pictures the game ships for its prompts", 'max': 128},
    {'entity': 'how-a-vehicle-drives', 'bundle': 'sharedassets1.assets', 'match': "T_Scooter_1_AlbedoTransparency", 'file': 'how-a-vehicle-drives-scooter.jpg', 'note': "the game's own body texture for one of its scooters, one of the vehicle textures it ships", 'max': 1024, 'quality': 84},
    {'entity': 'money-as-an-object-in-the-shop', 'bundle': 'resources.assets', 'match': "US_one_dollar_bill,_obverse,_series_2009", 'file': 'money-as-an-object-in-the-shop-note.png', 'note': "the game's own picture of a one-dollar note, one of the money pictures the build ships", 'max': 512},
    {'entity': 'dirt-dust-and-rubbish-are-three-jobs', 'bundle': 'sharedassets2.assets', 'match': "Garbage_Bag_A", 'file': 'dirt-dust-and-rubbish-are-three-jobs-bags.jpg', 'note': "the game's own texture for its rubbish bags, one of the objects the rubbish job is about", 'max': 1024, 'quality': 84},
    {'entity': 'online-orders-and-how-they-are-tracked', 'bundle': 'resources.assets', 'match': "T_OnlineOrder_indicator", 'file': 'online-orders-and-how-they-are-tracked-indicator.png', 'note': "the game's own indicator picture for an online order"},
    {'entity': 'the-shops-status-its-doors-and-its-ground', 'bundle': 'sharedassets2.assets', 'match': "T_Door_Var_AlbedoTransparency", 'file': 'the-shops-status-its-doors-and-its-ground-doors.jpg', 'note': "the game's own sheet of door variants, with the panel that goes beside them", 'max': 1024, 'quality': 84},
    # These two name their subject outright, so the mapping needs no interpretation.
    # Reviewed by eye and dropped: T_CategorySign_AlbedoTransparency exports as the blank white plate the
    # signs are printed on, with no category on it; the finished dairy sign above is what the entry shows.
    {'entity': 'mixing-paint-and-picking-a-colour', 'bundle': 'sharedassets2.assets', 'match': "T_IconAtlas_PaintBuckets", 'file': 'mixing-paint-and-picking-a-colour-buckets.jpg', 'note': "the game's own icon atlas of the paint buckets a colour is picked from", 'max': 1024, 'quality': 84},
    {'entity': 'the-road-traffic-and-its-signals', 'bundle': 'sharedassets2.assets', 'match': "Road_Signs_A", 'file': 'the-road-traffic-and-its-signals-signs.jpg', 'note': "the game's own road-sign texture, the signage the street traffic obeys", 'max': 512, 'quality': 88},
  # The paper bag the checkout entry describes. The albedo is the bag's own surface and the icon is the
  # picture the game keeps of a bag with its tag, so neither mapping needs interpretation.
  {'entity': 'paper-bags-and-packing-a-purchase', 'bundle': 'resources.assets', 'match': "T_PaperBag_AlbedoTransparency", 'file': 'paper-bags-and-packing-a-purchase-bag.jpg', 'note': "the game's own albedo texture for the paper bag it builds", 'max': 512, 'quality': 88},
  {'entity': 'paper-bags-and-packing-a-purchase', 'bundle': 'sharedassets2.assets', 'match': "T_Paperbagwtag_icon", 'file': 'paper-bags-and-packing-a-purchase-icon.jpg', 'note': "the game's own icon picture of a paper bag with its tag", 'max': 512, 'quality': 88},
  # The customer speech entry names the bubble a customer's line is drawn in. Both frames name themselves,
  # and the two sizes are the two the game keeps, so neither mapping needs interpretation.
  {'entity': 'what-the-customers-say', 'bundle': 'resources.assets', 'match': "Frame_SpeechBubble04_White", 'file': 'what-the-customers-say-bubble.png', 'note': "the speech bubble frame the game draws a customer's line inside", 'max': 256},
  {'entity': 'what-the-customers-say', 'bundle': 'sharedassets0.assets', 'match': "Frame_SpeechBubble01", 'file': 'what-the-customers-say-small-bubble.png', 'note': "the smaller speech bubble frame the game ships for customer speech", 'max': 256},
  # The product entry describes shelves drawn from product pictures. These two sheets are those pictures for
  # the game's extra products, so neither mapping needs interpretation.
  {'entity': 'how-a-product-is-drawn-on-a-shelf', 'bundle': 'sharedassets2.assets', 'match': "T_IconAtlasProductDlc", 'file': 'how-a-product-is-drawn-on-a-shelf-atlas.jpg', 'note': "the game's own atlas of product pictures, the sheet the goods on a shelf are drawn from", 'max': 1024, 'quality': 84},
  {'entity': 'how-a-product-is-drawn-on-a-shelf', 'bundle': 'sharedassets2.assets', 'match': "T_IconAtlasProductDlc_2", 'file': 'how-a-product-is-drawn-on-a-shelf-atlas2.jpg', 'note': "a second atlas of product pictures the game ships for a further set of goods", 'max': 1024, 'quality': 84},
  # The controls entry names the pictures the game's own prompts are built from, and this sheet names itself.
  {'entity': 'the-controls-the-menus-are-built-from', 'bundle': 'resources.assets', 'match': "keyboard-&-mouse_sheet_double", 'file': 'the-controls-the-menus-are-built-from-sheet.jpg', 'note': "the game's own sheet of keyboard and mouse pictures, the art its control prompts are drawn from", 'max': 1024, 'quality': 84},
  # The tutorial entry names the online-order tutorial; this is the hint picture the game ships for the tablet.
  {'entity': 'the-tutorials-that-point-you-at-things', 'bundle': 'sharedassets2.assets', 'match': "tablet hint image", 'file': 'the-tutorials-that-point-you-at-things-hint.jpg', 'note': "the hint picture the game ships for the tablet, drawn to point a player at what to do", 'max': 1024, 'quality': 84},
  # The box entry names the cardboard the shop's boxes are made of. Both textures name themselves.
  {'entity': 'the-boxes-in-the-back-room', 'bundle': 'resources.assets', 'match': "T_CardboardBox_greengrocer's_AlbedoTransparency", 'file': 'the-boxes-in-the-back-room-greengrocer.jpg', 'note': "the game's own cardboard box texture for a greengrocer's delivery", 'max': 1024, 'quality': 84},
  {'entity': 'the-boxes-in-the-back-room', 'bundle': 'resources.assets', 'match': "T_20X20X20_Cardboardbox_BCA", 'file': 'the-boxes-in-the-back-room-box.jpg', 'note': "the game's own base colour and alpha texture for one of the box sizes it ships", 'max': 1024, 'quality': 84},
  # The settings entry names the settings screens; this asset is the game's own settings menu picture, and the
  # shoplifter entry gets the screen the shoplifter warning is taught on.
  {'entity': 'the-settings-and-the-keys-you-can-change', 'bundle': 'sharedassets2.assets', 'match': "EnableShoplifterScreen", 'file': 'the-settings-and-the-keys-you-can-change-screen.jpg', 'note': "the game's own settings screen picture, showing the gameplay tab and its rows", 'max': 1024, 'quality': 84},
  {'entity': 'shoplifters-in-your-shop', 'bundle': 'sharedassets2.assets', 'match': "ShoplifterScreen", 'file': 'shoplifters-in-your-shop-screen.jpg', 'note': "the game's own picture of a shoplifter at a shelf, from the screen the warning is taught on", 'max': 1024, 'quality': 84},
  # The menu entry names the first screen the game shows; both assets are that screen's own background art.
  {'entity': 'the-menu-the-game-opens-on', 'bundle': 'resources.assets', 'match': "Main Menu BG", 'file': 'the-menu-the-game-opens-on-background.jpg', 'note': "the background picture the game draws behind its main menu", 'max': 1024, 'quality': 84},
  {'entity': 'the-menu-the-game-opens-on', 'bundle': 'sharedassets1.assets', 'match': "Mainmenu_Background", 'file': 'the-menu-the-game-opens-on-background-2.jpg', 'note': "a second main menu background the game ships", 'max': 1024, 'quality': 84},
  # The pause menu entry names the menu's own icon; this is the app-grid glyph the game draws for it.
  {'entity': 'the-menu-you-pause-into', 'bundle': 'sharedassets2.assets', 'match': "Icon_MenuIcon01_Menu_s", 'file': 'the-menu-you-pause-into-menu.jpg', 'note': "the menu icon the game itself draws for the pause menus, a grid of four rounded squares", 'max': 128, 'quality': 92},
  # This asset is the produce label the game itself draws, a barcode with a yellow band and green shoots.
  {'entity': 'barcodes-and-the-scanner', 'bundle': 'sharedassets2.assets', 'match': "T_Barcode_Vegie", 'file': 'barcodes-and-the-scanner-barcode-vegie.png', 'note': "the produce label the game itself draws, a barcode with a yellow band and green shoots", 'max': 512, 'quality': 92},
  # This asset is the game's own picture of the shop tablet and the handheld scanner, opened before it was accepted.
  {'entity': 'the-computer-and-the-tablet', 'bundle': 'sharedassets2.assets', 'match': "TabletScannerIcon", 'file': 'the-computer-and-the-tablet-tablet-and-scanner.png', 'note': "the game's own picture of the shop tablet and the handheld scanner", 'max': 512, 'quality': 92},
  # This asset is the game's own picture of the security camera it hangs in the shop, opened before it was accepted.
  {'entity': 'security-cameras-and-guards', 'bundle': 'sharedassets2.assets', 'match': "Security_Camera", 'file': 'security-cameras-and-guards-camera.png', 'note': "the game's own picture of the wall-mounted security camera it hangs in the shop", 'max': 512, 'quality': 92},
  # These two assets are the game's own pictures of two of the product lines it sells, opened before they were accepted.
  {'entity': 'how-a-product-is-drawn-on-a-shelf', 'bundle': 'sharedassets2.assets', 'match': "T_Baby_Food_Pack_Icon", 'file': 'how-a-product-is-drawn-on-a-shelf-baby-formula.png', 'note': "the game's own picture of a baby formula tub it sells, label and all", 'max': 512, 'quality': 92},
  {'entity': 'how-a-product-is-drawn-on-a-shelf', 'bundle': 'sharedassets2.assets', 'match': "Cat Food_Miaoumiam", 'file': 'how-a-product-is-drawn-on-a-shelf-cat-food.png', 'note': "the game's own picture of a cat food bag it sells, label and all", 'max': 512, 'quality': 92},
  # These two assets are the game's own produce aisle sign and its own logo, both opened before they were accepted.
  {'entity': 'signs-labels-and-organising', 'bundle': 'sharedassets2.assets', 'match': "Sign9_Produce", 'file': 'signs-labels-and-organising-produce-sign.png', 'note': "the produce sign the game itself draws for the aisle, an apple, an avocado and a carrot", 'max': 256, 'quality': 92},
  {'entity': 'signs-labels-and-organising', 'bundle': 'sharedassets2.assets', 'match': "Sign6_Meat", 'file': 'signs-labels-and-organising-meat-sign.png', 'note': "the meat sign the game itself draws for the aisle, a cut of meat with a bone", 'max': 256, 'quality': 92},
  {'entity': 'signs-labels-and-organising', 'bundle': 'sharedassets2.assets', 'match': "Sign7_Frozen", 'file': 'signs-labels-and-organising-frozen-sign.png', 'note': "the frozen sign the game itself draws for the aisle, a frozen bag with a snowflake beside a pizza box", 'max': 256, 'quality': 92},
  {'entity': 'signs-labels-and-organising', 'bundle': 'sharedassets2.assets', 'match': "Sign12_Wine", 'file': 'signs-labels-and-organising-wine-sign.png', 'note': "the wine sign the game itself draws for the aisle, a bottle and a glass", 'max': 256, 'quality': 92},
  {'entity': 'signs-labels-and-organising', 'bundle': 'sharedassets2.assets', 'match': "Sign10_Toilet", 'file': 'signs-labels-and-organising-toilet-sign.png', 'note': "one of the game's own signs: a roll of toilet paper on its holder", 'max': 256, 'quality': 92},
  {'entity': 'checkout-and-cashiers', 'bundle': 'sharedassets2.assets', 'match': "T_Icon_ShoppingBasket", 'file': 'checkout-and-cashiers-basket.png', 'note': "the basket icon the game ships with the checkout artwork", 'max': 512},
  {'entity': 'checkout-and-cashiers', 'bundle': 'sharedassets2.assets', 'match': "T_Icon_ShoppingBasket_1_New", 'file': 'checkout-and-cashiers-basket-new.png', 'note': "the newer basket icon the game ships beside it", 'max': 512},
  {'entity': 'the-machinery-behind-each-job', 'bundle': 'sharedassets2.assets', 'match': "T_icon_Glusim_GlueGun", 'file': 'the-machinery-behind-each-job-glue-gun.png', 'note': "the icon the game ships for one of the branded tools its jobs use, a hot glue gun", 'max': 512},
  {'entity': 'the-machinery-behind-each-job', 'bundle': 'sharedassets2.assets', 'match': "T_icon_Hyunda_LevelSet", 'file': 'the-machinery-behind-each-job-level-set.png', 'note': "a second branded tool icon, a mini level set", 'max': 512},
  {'entity': 'the-machinery-behind-each-job', 'bundle': 'sharedassets2.assets', 'match': "T_icon_Mezurex_TapeMeasure", 'file': 'the-machinery-behind-each-job-tape-measure.png', 'note': "a third branded tool icon, a tape measure", 'max': 512},
  {'entity': 'the-machinery-behind-each-job', 'bundle': 'sharedassets2.assets', 'match': "T_icon_Nailcore_PortableToolbox", 'file': 'the-machinery-behind-each-job-toolbox.png', 'note': "a fourth branded tool icon, a portable toolbox", 'max': 512},
  {'entity': 'the-day-cycle', 'bundle': 'sharedassets2.assets', 'match': "Sun Shimmer1", 'file': 'the-day-cycle-sun.png', 'note': "the sun the game draws for its day, a warm flare with rays", 'max': 512},
  {'entity': 'the-mode-you-place-things-in', 'bundle': 'resources.assets', 'match': "T_GridTexture", 'file': 'the-mode-you-place-things-in-grid.png', 'note': "the grid the placing mode draws, white lines crossing on a dark field", 'max': 1024},
  {'entity': 'how-the-game-shows-what-you-can-use', 'bundle': 'sharedassets2.assets', 'match': "T_Icon_Mop", 'file': 'how-the-game-shows-what-you-can-use-mop.png', 'note': "the icon the game ships for the mop, one of the tools a player can use", 'max': 512},
  {'entity': 'the-menu-you-pause-into', 'bundle': 'resources.assets', 'match': "Icon_PictoIcon_Back", 'file': 'the-menu-you-pause-into-back.png', 'note': "the back pictogram from the game's own menu set", 'max': 128},
  {'entity': 'the-menu-you-pause-into', 'bundle': 'sharedassets2.assets', 'match': "Icon_PictoIcon_Wifi", 'file': 'the-menu-you-pause-into-wifi.png', 'note': "the signal pictogram from the game's menu set", 'max': 128},
  {'entity': 'the-menu-you-pause-into', 'bundle': 'sharedassets2.assets', 'match': "Icon_PictoIcon_Search", 'file': 'the-menu-you-pause-into-search.png', 'note': "the search mark from the game's menu set", 'max': 128},
  {'entity': 'the-management-tabs', 'bundle': 'sharedassets1.assets', 'match': "Frame_ItemFrame03_Navy", 'file': 'the-management-tabs-item-frame.png', 'note': "the navy item frame the management tabs are drawn in", 'max': 256},
  {'entity': 'the-management-tabs', 'bundle': 'sharedassets2.assets', 'match': "Frame_BarFrame_Top02_Navy", 'file': 'the-management-tabs-bar-frame.png', 'note': "the navy top bar frame the management tabs use", 'max': 512},
  {'entity': 'the-menu-you-pause-into', 'bundle': 'sharedassets2.assets', 'match': "Icon_PictoIcon_Next02", 'file': 'the-menu-you-pause-into-next.png', 'note': "the next pictogram from the game's own menu set", 'max': 128},
  {'entity': 'the-menu-you-pause-into', 'bundle': 'sharedassets2.assets', 'match': "Icon_PictoIcon_Prev02", 'file': 'the-menu-you-pause-into-previous.png', 'note': "the previous pictogram from the game's own menu set", 'max': 128},
  {'entity': 'painting-the-walls', 'bundle': 'sharedassets2.assets', 'match': "BucketIcon_1", 'file': 'painting-the-walls-bucket-gold.png', 'note': "one of the numbered paint bucket icons the game ships, a tin of golden paint", 'max': 512},
  {'entity': 'painting-the-walls', 'bundle': 'sharedassets2.assets', 'match': "BucketIcon_2", 'file': 'painting-the-walls-bucket-white.png', 'note': "a second numbered bucket icon, the same tin in off-white", 'max': 512},
  {'entity': 'painting-the-walls', 'bundle': 'sharedassets2.assets', 'match': "BucketIcon_28", 'file': 'painting-the-walls-bucket-teal.png', 'note': "a third numbered bucket icon, the same tin in teal", 'max': 512},
  {'entity': 'the-oven-and-the-baker', 'bundle': 'sharedassets2.assets', 'match': "T_Bakery-Display_Double", 'file': 'the-oven-and-the-baker-display.png', 'note': "the double bakery display the game ships, two racks of tilted trays", 'max': 512},
  {'entity': 'the-fresh-produce-in-the-shop', 'bundle': 'sharedassets2.assets', 'match': "Artichoke", 'file': 'the-fresh-produce-in-the-shop-artichoke.png', 'note': "the picture the game ships for one of its fresh goods, a green artichoke", 'max': 512},
  {'entity': 'shelf-slots-and-display-space', 'bundle': 'sharedassets2.assets', 'match': "Shelf_Single", 'file': 'shelf-slots-and-display-space-shelf.png', 'note': "the single shelf unit the game ships, a white gondola with three shelves", 'max': 512},
  {'entity': 'the-racks-the-back-room-uses', 'bundle': 'sharedassets2.assets', 'match': "Small Rack", 'file': 'the-racks-the-back-room-uses-small-rack.png', 'note': "the game's artwork for the smaller back-room rack, a black steel frame", 'max': 512},
  {'entity': 'the-fridges-and-freezers', 'bundle': 'sharedassets2.assets', 'match': "Fridge_Double", 'file': 'the-fridges-and-freezers-fridge.png', 'note': "the double display fridge the game ships, two glass doors and shelves", 'max': 512},
  {'entity': 'the-fridges-and-freezers', 'bundle': 'sharedassets2.assets', 'match': "Freezer_Double", 'file': 'the-fridges-and-freezers-freezer.png', 'note': "the double chest freezer the game ships, a glass lid and a control panel", 'max': 512},
  {'entity': 'checkout-and-cashiers', 'bundle': 'sharedassets2.assets', 'match': "Mirrored Checkout Counter", 'file': 'checkout-and-cashiers-mirrored-counter.png', 'note': "the mirrored checkout counter the game ships, an L-shaped till with two screens", 'max': 512},
  {'entity': 'the-fridges-and-freezers', 'bundle': 'sharedassets2.assets', 'match': "Freezer_Single", 'file': 'the-fridges-and-freezers-single-freezer.png', 'note': "the single chest freezer the game ships, the same piece at half the width", 'max': 512},
  # The warning entry names the dirtiness warning canvas; this asset is the icon that warning draws.
  {'entity': 'how-the-game-decides-to-warn-you', 'bundle': 'resources.assets', 'match': "Dirtiness Indicator Icon", 'file': 'how-the-game-decides-to-warn-you-dirtiness.png', 'note': "the icon the game draws for the dirtiness warning", 'max': 317},
  # The version entry names which build this site documents; the game ships its own Early Access tag as art.
  {'entity': 'which-version-this-site-documents', 'bundle': 'resources.assets', 'match': "Early Access Tag", 'file': 'which-version-this-site-documents-early-access.png', 'note': "the Early Access tag the game ships as store art", 'max': 1024},
  # The hints entry names the hints the game gives; this asset names itself as the picture a hint uses.
  {'entity': 'the-hints-and-pings-the-game-gives', 'bundle': 'sharedassets2.assets', 'match': "tablet hint image", 'file': 'the-hints-and-pings-the-game-gives-hint.jpg', 'note': "the picture the game's own hint uses on the tablet", 'max': 1024, 'quality': 84},
  # The floors entry names the floor you can paint; this asset is one of the floor patterns the game ships.
  {'entity': 'floors-and-floor-painting', 'bundle': 'sharedassets2.assets', 'match': "FloorIcon_10", 'file': 'floors-and-floor-painting-pattern.jpg', 'note': "one of the floor patterns the game offers for a painted floor", 'max': 512, 'quality': 88},
  # The lights entry names the fittings the shop uses; this asset is the icon the game draws for an interior spot light.
  {'entity': 'the-lights-and-the-switches', 'bundle': 'sharedassets2.assets', 'match': "Interior Spot Light Icon", 'file': 'the-lights-and-the-switches-spot-icon.png', 'note': "the icon the game itself draws for an interior spot light", 'max': 512},
  # Rejected after opening: "T_PlasticBasket_AlbedoTransparency" is a blocky green, black and tan surface atlas that does
  # not read as a basket, so the mapping was dropped rather than kept.
  # The main-menu entry names the screens the game opens on; this asset is the game's own title art.
  {'entity': 'the-menu-the-game-opens-on', 'bundle': 'sharedassets0.assets', 'match': "Game Name", 'file': 'the-menu-the-game-opens-on-title.jpg', 'note': "the game's own name art", 'max': 1024, 'quality': 88},
  # Rejected after opening: "T_BakeryDlc_Display_RGBA" is named for the bakery pack's display, but the file is a blue
  # normal map of the fixture's surfaces rather than its colour art, so it would not show a reader what the display
  # looks like. Tried and dropped rather than kept as a mapping.
  # The body entry names the character you look through; this asset is the game's own colour sheet for that body.
  {'entity': 'the-body-you-do-not-see', 'bundle': 'resources.assets', 'match': "BodyMAT_AlbedoTransparency", 'file': 'the-body-you-do-not-see-body.png', 'note': "the colour sheet the game ships for the body of the character the player controls", 'max': 1024, 'quality': 86},
  # The questions page names the questions players ask; this asset is the question picture the game draws.
  {'entity': 'questions-players-ask', 'bundle': 'resources.assets', 'type': 'Sprite', 'match': "keyboard_question", 'file': 'questions-players-ask-question.png', 'note': "the game's own question picture, drawn as a key marked with a question mark", 'max': 256},
  # The bat entry names the ball-game pieces the shop carries; these two are the game's own bat icon and its
  # painted basketball court.
  {'entity': 'the-baseball-bat', 'bundle': 'sharedassets2.assets', 'match': "T_Icon_BaseballBat", 'file': 'the-baseball-bat-icon.png', 'note': "the icon the game itself draws for the baseball bat", 'max': 512},
  {'entity': 'the-baseball-bat', 'bundle': 'sharedassets2.assets', 'match': "T_BasketballCourt_A", 'file': 'the-baseball-bat-court.png', 'note': "the painted basketball court the game ships with the hoop", 'max': 1024, 'quality': 86},
  # The drinks entry names the drink brands the shop carries; these three are the game's own product art for a
  # cola, for the bottled juice and for a wine.
  {'entity': 'the-drinks-the-shop-carries', 'bundle': 'sharedassets2.assets', 'match': "Soda Cola", 'file': 'the-drinks-the-shop-carries-cola.png', 'note': "the game's own cola bottle, a dark soda with a red cap and a Cola label", 'max': 512},
  {'entity': 'the-drinks-the-shop-carries', 'bundle': 'sharedassets2.assets', 'match': "Orange Juice Bio Juice", 'file': 'the-drinks-the-shop-carries-juice.png', 'note': "the game's own Bio Juice carton, a one-litre orange juice pack", 'max': 512},
  {'entity': 'the-drinks-the-shop-carries', 'bundle': 'sharedassets2.assets', 'match': "Wine Chebon", 'file': 'the-drinks-the-shop-carries-wine.png', 'note': "the game's own Chebon wine bottle, a pale rose with a printed label", 'max': 512},
  # The shop-windows entry names the glass the shop is glazed with and the shards a break leaves; these two are the
  # window atlas the game ships and the strip of shard sprites it cuts them from.
  {'entity': 'the-shop-windows-and-the-glass', 'bundle': 'sharedassets2.assets', 'match': "T_Glass_Atlas_AlbedoTransparency", 'file': 'the-shop-windows-and-the-glass-atlas.png', 'note': "the game's own window atlas: curtained and blinded panes beside plain glass", 'max': 1024, 'quality': 86},
  {'entity': 'the-shop-windows-and-the-glass', 'bundle': 'resources.assets', 'match': "T_Shard_Particles", 'file': 'the-shop-windows-and-the-glass-shards.png', 'note': "the strip of shard silhouettes the game cuts a broken window into", 'max': 512},
  # The meat-and-dairy entry names the section's own fixture and the goods it holds; these three are the game's own
  # product art for a parmesan, for the milk carton and for the egg box.
  {'entity': 'the-meat-and-dairy-section', 'bundle': 'sharedassets2.assets', 'match': "Cheese Parmesan_EROS", 'file': 'the-meat-and-dairy-section-cheese.png', 'note': "the game's own parmesan pack, a green Eros wrapper marked Parmigiano Reggiano", 'max': 512},
  {'entity': 'the-meat-and-dairy-section', 'bundle': 'sharedassets2.assets', 'match': "Milk Bourlait", 'file': 'the-meat-and-dairy-section-milk.png', 'note': "the game's own milk carton, a one-litre Bourlait semi-skimmed", 'max': 512},
  {'entity': 'the-meat-and-dairy-section', 'bundle': 'sharedassets2.assets', 'match': "Eggs Bio", 'file': 'the-meat-and-dairy-section-eggs.png', 'note': "the game's own egg box, an eight-egg bio carton", 'max': 512},
  # The icon entry names the line icons the game draws for its own screens; these three are that artwork.
  {'entity': 'the-line-icons-the-game-draws', 'bundle': 'sharedassets2.assets', 'match': "icon_line_shopping_14", 'file': 'the-line-icons-the-game-draws-shopping.png', 'note': "one of the game's shopping icons: a trolley drawn in line", 'max': 256},
  {'entity': 'the-line-icons-the-game-draws', 'bundle': 'sharedassets1.assets', 'match': "icon_line_tool_44", 'file': 'the-line-icons-the-game-draws-tool.png', 'note': "one of the game's tool icons: a bin drawn in line", 'max': 256},
  {'entity': 'the-line-icons-the-game-draws', 'bundle': 'sharedassets2.assets', 'match': "icon_line_weather_18", 'file': 'the-line-icons-the-game-draws-weather.png', 'note': "one of the game's weather icons: a water drop drawn in line", 'max': 256},
  # The plants entry names the flowers and planters the game ships; this asset is the plant art itself.
  {'entity': 'the-plants-and-planters', 'bundle': 'sharedassets2.assets', 'match': "Flowers_A", 'file': 'the-plants-and-planters-flowers.png', 'note': "the game's own plant sheet: leaves, ferns and flowering shrubs", 'max': 512},
  {'entity': 'mixing-paint-and-picking-a-colour', 'bundle': 'sharedassets2.assets', 'match': "BucketIcon_10", 'file': 'mixing-paint-and-picking-a-colour-bucket.png', 'note': "one of the numbered paint buckets the game ships, filled with a colour", 'max': 512},
]

os.makedirs(OUT_DIR, exist_ok=True)
records = []
# Loading a bundle is by far the slowest part of this script, and mappings are grouped by bundle, so the
# loaded environment is cached per file. Reading the same bundle twice used to make the run long enough to be
# killed halfway, which could leave the manifest written from a partial run.
_env_cache = {}
for m in MAPPINGS:
    path = os.path.join(ROOT, m['bundle'])
    if not os.path.exists(path):
        print('  MISSING BUNDLE ' + path); continue
    if path not in _env_cache:
        _env_cache[path] = UnityPy.load(path)
    env = _env_cache[path]
    exported = 0
    for o in env.objects:
        # Most artwork is a Texture2D, but some of the game's icons exist only as a Sprite cut out of an atlas,
        # so an explicit mapping may ask for one.
        if o.type.name != m.get('type', 'Texture2D'):
            continue
        try:
            d = o.read()
            name = getattr(d, 'm_Name', '') or ''
        except Exception:
            continue
        if name != m['match']:
            continue
        dest = os.path.join(OUT_DIR, m['file'])
        img = d.image
        # Keep the game image faithful but web-sized: the raw 4096px atlases are several megabytes each,
        # and a wiki page should not make a phone download that. The record below states the written size.
        cap = m.get('max')
        if cap and max(img.size) > cap:
            scale = cap / float(max(img.size))
            img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))))
        if m['file'].lower().endswith(('.jpg', '.jpeg')):
            # A JPEG cannot carry alpha, so a transparent field keeps whatever colour the texture stores under it.
            # Most icon sheets here store black there, which is the colour this site draws pictures on, but a sheet
            # that stores white exports looking blank — a PNG mapping keeps its alpha and is safe either way.
            img.convert('RGB').save(dest, quality=m.get('quality', 85), optimize=True)
        else:
            img.save(dest)
        raw = open(dest, 'rb').read()
        records.append({
            'entity': m['entity'], 'kind': 'game', 'file': 'mapped/' + m['file'],
            'sourceBundle': m['bundle'], 'assetName': name, 'note': m['note'],
            'width': img.width, 'height': img.height, 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest(),
        })
        print('  exported %-34s %dx%d %d bytes sha256=%s' % (m['file'], img.width, img.height, len(raw), records[-1]['sha256'][:12]))
        exported += 1
        break
    if not exported:
        print('  no asset matched ' + m['match'])
json.dump({'source': ROOT, 'records': records}, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('wrote %s with %d record(s)' % (MANIFEST, len(records)))