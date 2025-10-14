"""
Shared configuration between backend and frontend
Liste de ports à essayer pour le serveur WebSocket
"""

# Ports peu utilisés par défaut, dans l'ordre de préférence
AVAILABLE_PORTS = [
    8765,  # Port peu commun
    9876,  # Rarement utilisé
    7890,  # Peu utilisé
    6543,  # Rarement occupé
    5432,  # Peut être occupé par PostgreSQL
    8081,  # Alternative à 8080
    8082,  # Alternative à 8080
    8083,  # Alternative à 8080
]

DEFAULT_HOST = '0.0.0.0'
