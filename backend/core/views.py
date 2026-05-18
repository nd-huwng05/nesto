from django.http import JsonResponse


def home_detail(request):
    payload = {
        "id": "hotel-001",
        "name": "Swiss Hotel",
        "location": "211B Kore Street, London, England",
        "rating": 4.3,
        "reviews": 4231,
        "price": {
            "amount": 1500000,
            "currency": "VND",
            "label": "/night"
        },
        "description": "Hotel Room meets an area that is designed and constructed to be occupied by one or more persons on Hotel Property, which is separate from sleeping area.",
        "hero_image": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80",
        "gallery": [
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80"
        ],
        "rooms": [
            {
                "id": "room-121",
                "name": "Room 121",
                "description": "Room have view family",
                "price": {
                    "amount": 1100000,
                    "currency": "VND"
                },
                "type": "Family",
                "view": "Beach",
                "image": "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80"
            },
            {
                "id": "room-122",
                "name": "Room 122",
                "description": "Room have view beach",
                "price": {
                    "amount": 1000000,
                    "currency": "VND"
                },
                "type": "Family",
                "view": "Beach",
                "image": "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80"
            },
            {
                "id": "room-123",
                "name": "Room 123",
                "description": "Room have view beach",
                "price": {
                    "amount": 1200000,
                    "currency": "VND"
                },
                "type": "Family",
                "view": "Beach",
                "image": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
            },
            {
                "id": "room-124",
                "name": "Room 124",
                "description": "Room have view beach",
                "price": {
                    "amount": 1300000,
                    "currency": "VND"
                },
                "type": "Family",
                "view": "Beach",
                "image": "https://images.unsplash.com/photo-1596204971508-3f2f9dc97f27?auto=format&fit=crop&w=800&q=80"
            }
        ],
        "watchlist": {
            "title": "Watchlist",
            "subtitle": "Review's customer were used room",
            "reviewer": "Ngọc Lan",
            "review": "The room is very beautiful",
            "image": "https://images.unsplash.com/photo-1616594039964-3c8c76f3d9ab?auto=format&fit=crop&w=1200&q=80"
        }
    }
    return JsonResponse(payload)