import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")  # kendi dosya adını buraya yaz
firebase_admin.initialize_app(cred)

db = firestore.client()

lookup_data = {
    "genderOptions": ["Dişi", "Erkek", "Belli değil"],
    "healthOptions": ["Sağlıklı", "Hasta"],
    "rodTypes": ['Spinning', 'Casting', 'Fly', 'Trolling', 'Surf', 'Ice', 'Telescopic', 'Travel', 'Boat', 'Jigging', 'Baitcasting', 'Centrepin', 'Match', 'Feeder', 'Carp', 'Ultra Light', 'Heavy Duty', 'Spod', 'Float'],
    "reelTypes": ['Spinning Reel', 'Baitcasting Reel', 'Fly Reel', 'Trolling Reel', 'Spincast Reel', 'Centrepin Reel', 'Surf Reel', 'Conventional Reel', 'Electric Reel', 'Inline Ice Reel'],
    "lineThicknessOptions": ['0.10 mm', '0.12 mm', '0.14 mm', '0.16 mm', '0.18 mm', '0.20 mm', '0.22 mm', '0.25 mm', '0.28 mm', '0.30 mm', '0.35 mm', '0.40 mm', '0.45 mm', '0.50 mm', '0.60 mm', '0.70 mm', '0.80 mm', '0.90 mm', '1.00 mm', '1.20 mm'],
    "baitTypes": ['Worm', 'Grub', 'Minnow', 'Crankbait', 'Spinnerbait', 'Jerkbait', 'Soft Plastic', 'Jig', 'Spoon', 'Popper', 'Swimbait', 'Buzzbait', 'Topwater', 'Live Bait', 'Cut Bait', 'Dough Bait', 'Artificial Fly', 'Lure'],
    "baitColors": ['White', 'Black', 'Red', 'Green', 'Blue', 'Yellow', 'Pink', 'Orange', 'Purple', 'Chartreuse', 'Silver', 'Gold', 'Brown', 'Glow', 'Transparent', 'Natural', 'Firetiger', 'Watermelon', 'Crawfish'],
    "baitWeights": ['1g', '2g', '3g', '5g', '7g', '10g', '14g', '18g', '21g', '28g', '35g', '42g', '50g', '60g', '75g', '90g', '100g', '120g', '150g', '200g'],
    "seaColors": ['Blue', 'Dark Blue', 'Green', 'Turquoise', 'Brown', 'Grey', 'Clear', 'Muddy', 'Milky', 'Deep Blue', 'Emerald', 'Teal', 'Blackish'],
    "moonPhases": ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent']
}

for key, values in lookup_data.items():
    db.collection("lookup_tables").document(key).set({"values": values})

print("Tüm lookup verileri Firestore'a yüklendi.")
