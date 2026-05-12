#!/usr/bin/env python3
"""
seed_dynamodb.py
────────────────────────────────────────────────────────────────────────────────
Carga el catálogo completo de Acacia a la tabla DynamoDB `acacia-products`.

Uso:
    python seed_dynamodb.py                         # carga todos los productos
    python seed_dynamodb.py --dry-run               # muestra el JSON sin subir
    python seed_dynamodb.py --producto ACA-TV-001   # carga solo ese producto
    python seed_dynamodb.py --linea "Mesas de Centro"

Requisitos:
    - AWS CLI instalado y configurado (aws configure)
    - Perfil con permisos dynamodb:PutItem sobre la tabla acacia-products
    - Python 3.8+

Tabla destino : acacia-products
Región        : us-east-1
────────────────────────────────────────────────────────────────────────────────
"""

import json
import subprocess
import sys
import argparse
from datetime import datetime, timezone

# ── Configuración ──────────────────────────────────────────────────────────────
TABLE      = "acacia-products"
REGION     = "us-east-1"
WA_NUMBER  = "521XXXXXXXXXX"   # ← reemplazar con número real
S3_IMAGES  = "https://acacia-catalog-images.s3.amazonaws.com"
NOW        = datetime.now(timezone.utc).isoformat()

# ── Helpers ────────────────────────────────────────────────────────────────────
def slug(nombre: str) -> str:
    return nombre.lower().replace(" ", "-")

def wa_msg(nombre: str, ref: str) -> str:
    return f"Hola, me interesa el modelo {nombre} ({ref}). ¿Podrían darme más información?"

def price_entry(label: str, price: float | None, currency: str = "MXN") -> dict:
    return {"label": label, "price": price, "currency": currency}

def prices_por_talla(precio_m: float | None, material_label: str):
    """Genera los 4 niveles de precio basados en talla M."""
    if precio_m is None:
        return [price_entry("Cotización", None)]
    return [
        price_entry(f"S — {material_label}", round(precio_m * 0.80)),
        price_entry(f"M — {material_label} (Estándar)", round(precio_m)),
        price_entry(f"L — {material_label}", round(precio_m * 1.25)),
        price_entry(f"XL — {material_label}", round(precio_m * 1.55)),
    ]

def img(carpeta: str, archivo: str) -> str:
    return f"{S3_IMAGES}/{carpeta}/{archivo}.webp"

def make_item(
    id_: str,
    nombre: str,
    ref: str,
    family: str,
    linea: str,
    categoria: str,
    descripcion: str,
    tagline: str,
    specs: dict,
    prices: list,
    material_principal: str,
    acabado: str,
    iluminacion: str,
    instalacion: str,
    talla_base: str,
    tallas: dict,
    orden: int,
    sku_ref: str,
    active: bool = True,
) -> dict:
    """Construye el item DynamoDB en formato nativo (para aws dynamodb put-item)."""
    slug_ = slug(nombre)
    images = [img(slug_, "01"), img(slug_, "02"), img(slug_, "03")]
    cover  = images[0]

    return {
        "PK":  {"S": f"PRODUCT#{id_.lower()}"},
        "SK":  {"S": "METADATA"},

        # Identificación
        "id":     {"S": id_},
        "name":   {"S": nombre},
        "ref":    {"S": ref},
        "family": {"S": family},
        "linea":  {"S": linea},
        "slug":   {"S": slug_},
        "skuRef": {"S": sku_ref},

        # Contenido
        "description": {"S": descripcion},
        "tagline":     {"S": tagline},
        "categoria":   {"S": categoria},

        # Specs (map de strings)
        "specs": {"M": {k: {"S": v} for k, v in specs.items()}},

        # Material y acabado
        "materialPrincipal": {"S": material_principal},
        "acabado":           {"S": acabado},
        "iluminacion":       {"S": iluminacion},
        "instalacion":       {"S": instalacion},

        # Sistema de tallas
        "tallaBase": {"S": talla_base},
        "tallas": {"M": {
            t: {"M": {
                "dimensiones": {"S": info["dimensiones"]},
                "esBase":      {"BOOL": info["es_base"]},
            }}
            for t, info in tallas.items()
        }},

        # Precios (list of maps)
        "prices": {"L": [
            {"M": {
                "label":    {"S": p["label"]},
                "price":    {"N": str(p["price"])} if p["price"] is not None else {"NULL": True},
                "currency": {"S": p["currency"]},
            }}
            for p in prices
        ]},

        # Imágenes
        "images":     {"L": [{"S": u} for u in images]},
        "coverImage": {"S": cover},

        # WhatsApp
        "whatsappNumber":  {"S": WA_NUMBER},
        "whatsappMessage": {"S": wa_msg(nombre, ref)},

        # Control
        "active":    {"BOOL": active},
        "order":     {"N": str(orden)},
        "createdAt": {"S": NOW},
        "updatedAt": {"S": NOW},
    }


# ── Catálogo completo ─────────────────────────────────────────────────────────
CATALOG = [

    # ══════════════════════════════════════════════════════════════════════════
    # LÍNEA: MUEBLES PARA TV
    # ══════════════════════════════════════════════════════════════════════════
    make_item(
        id_="ACA-TV-001", nombre="VORDEN", ref="ACA-TV-001",
        family="Muebles TV", linea="Muebles para TV",
        categoria="Mueble TV Flotante con Iluminación",
        descripcion="Mueble TV flotante bicolor con nicho iluminado y marco metálico negro.",
        tagline="Luz que define la forma.",
        specs={
            "Dimensiones (M)": "160 × 40 × 35 cm",
            "Material principal": "Arce blanqueado",
            "Estructura": "Hierro forjado negro matte",
            "Iluminación": "LED ambar 2700K",
            "Instalación": "Flotante — perfil metálico oculto",
            "Piezas": "2 puertas, 1 nicho superior, 1 nicho LED inferior",
        },
        prices=prices_por_talla(None, "Arce blanqueado"),
        material_principal="Arce Blanqueado",
        acabado="Natural blanqueado + Negro Matte RAL 9005",
        iluminacion="Sí — tira LED ambar 2700K",
        instalacion="Flotante (pared)",
        talla_base="M",
        tallas={
            "S":  {"dimensiones": "120 × 35 × 30 cm", "es_base": False},
            "M":  {"dimensiones": "160 × 40 × 35 cm", "es_base": True},
            "L":  {"dimensiones": "200 × 45 × 38 cm", "es_base": False},
            "XL": {"dimensiones": "240+ × 45 × 40 cm", "es_base": False},
        },
        orden=1, sku_ref="ACA-TV-001",
    ),

    make_item(
        id_="ACA-TV-002", nombre="NOREN", ref="ACA-TV-002",
        family="Muebles TV", linea="Muebles para TV",
        categoria="Mueble TV Flotante Panorámico",
        descripcion="Mueble TV flotante panorámico en roble natural con nicho central iluminado.",
        tagline="La sala empieza aquí.",
        specs={
            "Dimensiones (XL base)": "240+ × 45 × 40 cm",
            "Material principal": "Roble natural macizo",
            "Acabado": "Aceite penetrante natural",
            "Iluminación": "LED ambar 2700K nicho central",
            "Instalación": "Flotante — perfil metálico oculto",
            "Piezas": "4 puertas laterales, 1 nicho central LED, tablero superior continuo",
        },
        prices=prices_por_talla(None, "Roble natural"),
        material_principal="Roble Natural",
        acabado="Roble natural con aceite penetrante",
        iluminacion="Sí — tira LED ambar 2700K en nicho central",
        instalacion="Flotante (pared)",
        talla_base="XL",
        tallas={
            "S":  {"dimensiones": "120 × 35 × 30 cm", "es_base": False},
            "M":  {"dimensiones": "160 × 40 × 35 cm", "es_base": False},
            "L":  {"dimensiones": "200 × 45 × 38 cm", "es_base": False},
            "XL": {"dimensiones": "240+ × 45 × 40 cm", "es_base": True},
        },
        orden=2, sku_ref="ACA-TV-002",
    ),

    make_item(
        id_="ACA-TV-003", nombre="SOLEN", ref="ACA-TV-003",
        family="Muebles TV", linea="Muebles para TV",
        categoria="Panel TV de Pared Completo",
        descripcion="Panel TV de pared completo con listones verticales, módulos blancos y nicho LED.",
        tagline="Arquitectura para tu sala.",
        specs={
            "Dimensiones (L base)": "260 × 40 × 190 cm (panel + base)",
            "Material principal": "MDF lacado blanco perla + laminado madera natural",
            "Listones": "Madera natural verticales",
            "Iluminación": "LED ambar 2700K módulo base",
            "Instalación": "Panel fijo empotrado a pared",
            "Piezas": "Panel mural, 2 cajones, 2 puertas, 1 nicho LED",
        },
        prices=prices_por_talla(None, "Blanco Perla + Madera"),
        material_principal="Blanco Perla / Madera Natural",
        acabado="Blanco Perla mate + laminado madera natural",
        iluminacion="Sí — tira LED ambar en módulo base",
        instalacion="Panel fijo en pared (empotrado)",
        talla_base="L",
        tallas={
            "S":  {"dimensiones": "180 × 35 × 140 cm", "es_base": False},
            "M":  {"dimensiones": "220 × 38 × 160 cm", "es_base": False},
            "L":  {"dimensiones": "260 × 40 × 190 cm", "es_base": True},
            "XL": {"dimensiones": "300+ × 40 × 210 cm", "es_base": False},
        },
        orden=3, sku_ref="ACA-TV-003",
    ),

    make_item(
        id_="ACA-TV-004", nombre="DAKOTA", ref="ACA-TV-004",
        family="Muebles TV", linea="Muebles para TV",
        categoria="Mueble TV Flotante Bicolor",
        descripcion="Mueble TV flotante con frentes blancos, estructura en roble y nicho LED lateral.",
        tagline="Blanco y madera. El clásico moderno.",
        specs={
            "Dimensiones (M)": "160 × 40 × 35 cm",
            "Material principal": "MDF lacado blanco + laminado roble",
            "Detalle": "Listones horizontales de roble inferiores",
            "Iluminación": "LED ambar 2700K nicho lateral",
            "Instalación": "Flotante — perfil metálico oculto",
            "Piezas": "3 puertas, 1 nicho LED, listones horizontales",
        },
        prices=prices_por_talla(None, "Blanco + Roble"),
        material_principal="Blanco y Roble",
        acabado="Blanco mate + roble natural",
        iluminacion="Sí — tira LED ambar en nicho lateral",
        instalacion="Flotante (pared)",
        talla_base="M",
        tallas={
            "S":  {"dimensiones": "120 × 35 × 30 cm", "es_base": False},
            "M":  {"dimensiones": "160 × 40 × 35 cm", "es_base": True},
            "L":  {"dimensiones": "200 × 45 × 38 cm", "es_base": False},
            "XL": {"dimensiones": "240+ × 45 × 40 cm", "es_base": False},
        },
        orden=4, sku_ref="ACA-TV-004",
    ),

    # ══════════════════════════════════════════════════════════════════════════
    # LÍNEA: REPISAS Y LIBREROS
    # ══════════════════════════════════════════════════════════════════════════
    make_item(
        id_="ACA-REP-001", nombre="LUMINA", ref="556681",
        family="Repisas", linea="Repisas y Libreros",
        categoria="Repisa Flotante con Iluminación",
        descripcion="Sistema de repisas flotantes con iluminación LED ambar posterior integrada.",
        tagline="Luz detrás de cada objeto.",
        specs={
            "Dimensiones (L)": "160–200 × 28 × 4.5 cm por repisa",
            "Material": "Arce o roble blanqueado",
            "Acabado": "Aceite penetrante natural",
            "Iluminación": "LED ambar 2700K cara posterior",
            "Instalación": "Flotante — perfil oculto",
            "Set": "3 a 5 repisas independientes",
        },
        prices=prices_por_talla(None, "Arce / Roble blanqueado"),
        material_principal="Arce / Roble Blanqueado",
        acabado="Natural claro con aceite penetrante",
        iluminacion="Sí — tira LED ambar 2700K cara posterior",
        instalacion="Flotante (pared) — perfil oculto",
        talla_base="L",
        tallas={
            "S":  {"dimensiones": "80–100 × 20 × 3.5 cm", "es_base": False},
            "M":  {"dimensiones": "120–150 × 25 × 4 cm",  "es_base": False},
            "L":  {"dimensiones": "160–200 × 28 × 4.5 cm","es_base": True},
            "XL": {"dimensiones": "220–300 × 30 × 5 cm",  "es_base": False},
        },
        orden=5, sku_ref="556681",
    ),

    make_item(
        id_="ACA-REP-002", nombre="ROMA", ref="889865",
        family="Libreros", linea="Repisas y Libreros",
        categoria="Librero Industrial Parado",
        descripcion="Librero parado industrial con estructura metálica negra y tableros en madera natural.",
        tagline="Orden con carácter.",
        specs={
            "Dimensiones (L)": "100 × 40 × 190 cm",
            "Material tableros": "Madera natural (pino o roble)",
            "Estructura": "Acero laminado negro matte",
            "Acabado": "Barniz natural + acero negro matte",
            "Instalación": "Piso — autoportante",
            "Niveles": "5 tableros",
        },
        prices=prices_por_talla(None, "Madera natural + Acero negro"),
        material_principal="Madera Natural + Acero Negro",
        acabado="Madera natural barnizada + acero negro matte",
        iluminacion="No",
        instalacion="Piso (autoportante)",
        talla_base="L",
        tallas={
            "S":  {"dimensiones": "60 × 30 × 120 cm",  "es_base": False},
            "M":  {"dimensiones": "80 × 35 × 160 cm",  "es_base": False},
            "L":  {"dimensiones": "100 × 40 × 190 cm", "es_base": True},
            "XL": {"dimensiones": "120 × 45 × 210 cm", "es_base": False},
        },
        orden=6, sku_ref="889865",
    ),

    make_item(
        id_="ACA-REP-003", nombre="STRAVE", ref="122322",
        family="Libreros", linea="Repisas y Libreros",
        categoria="Librero Modular con Iluminación",
        descripcion="Librero modular de gran formato en nogal con nichos iluminados y estructura de acero negro.",
        tagline="El mueble que se convierte en obra.",
        specs={
            "Dimensiones (XL base)": "220 × 45 × 200 cm",
            "Material": "Nogal o teca maciza",
            "Estructura": "Acero laminado negro matte (4 columnas)",
            "Iluminación": "LED ambar 2700K en cada nicho",
            "Instalación": "Piso — anclaje opcional a pared",
            "Configuración": "Nichos escalonados asimétricos",
        },
        prices=prices_por_talla(None, "Nogal / Teca + Acero negro"),
        material_principal="Nogal / Teca + Acero Negro",
        acabado="Nogal natural con aceite + acero negro matte",
        iluminacion="Sí — tira LED ambar 2700K en cada nicho",
        instalacion="Piso (autoportante) — anclaje opcional",
        talla_base="XL",
        tallas={
            "S":  {"dimensiones": "100 × 30 × 100 cm", "es_base": False},
            "M":  {"dimensiones": "140 × 35 × 140 cm", "es_base": False},
            "L":  {"dimensiones": "180 × 40 × 180 cm", "es_base": False},
            "XL": {"dimensiones": "220 × 45 × 200 cm", "es_base": True},
        },
        orden=7, sku_ref="122322",
    ),

    # ══════════════════════════════════════════════════════════════════════════
    # LÍNEA: BAR & BODEGA
    # ══════════════════════════════════════════════════════════════════════════
    make_item(
        id_="ACA-BAR-001", nombre="CAVA Pro", ref="343452",
        family="Bar & Bodega", linea="Bar & Bodega",
        categoria="Bar Flotante con Puerta Corrediza",
        descripcion="Bar flotante premium en negro y nogal con nichos abiertos, puerta corrediza y cajón.",
        tagline="Tu bar, sin disculpas.",
        specs={
            "Dimensiones (L)": "160 × 38 × 80 cm",
            "Cuerpo exterior": "MDF lacado negro matte",
            "Interiores": "Laminado nogal",
            "Puerta": "Corrediza nogal con LED ambar",
            "Cajón": "Negro matte — accesorios de bar",
            "Instalación": "Flotante — perfil metálico oculto",
        },
        prices=prices_por_talla(None, "Negro matte + Nogal"),
        material_principal="Nogal + Negro Matte",
        acabado="Negro Matte RAL 9005 exterior + Nogal natural interior",
        iluminacion="Sí — tira LED ambar 2700K en nichos",
        instalacion="Flotante (pared) — perfil metálico oculto",
        talla_base="L",
        tallas={
            "S":  {"dimensiones": "80 × 30 × 60 cm",  "es_base": False},
            "M":  {"dimensiones": "120 × 35 × 70 cm", "es_base": False},
            "L":  {"dimensiones": "160 × 38 × 80 cm", "es_base": True},
            "XL": {"dimensiones": "200 × 40 × 90 cm", "es_base": False},
        },
        orden=8, sku_ref="343452",
    ),

    make_item(
        id_="ACA-BAR-002", nombre="CAVA Vitrine", ref="332640",
        family="Bar & Bodega", linea="Bar & Bodega",
        categoria="Vitrina Bar Flotante",
        descripcion="Vitrina bar flotante de marco negro abierto con fondo en nogal e iluminación LED superior.",
        tagline="Exhibe. No ocultes.",
        specs={
            "Dimensiones (M)": "90 × 30 × 60 cm",
            "Marco": "Acero laminado negro matte",
            "Interior": "Fondo y repisa laminado nogal",
            "Iluminación": "LED ambar 2700K travesaño superior",
            "Instalación": "Flotante — anclaje en travesaños horizontales",
            "Estilo": "Open frame — sin puertas",
        },
        prices=prices_por_talla(None, "Marco negro + Nogal"),
        material_principal="Marco Negro + Fondo Nogal",
        acabado="Marco negro matte + nogal natural interior",
        iluminacion="Sí — tira LED ambar 2700K en travesaño superior",
        instalacion="Flotante (pared)",
        talla_base="M",
        tallas={
            "S":  {"dimensiones": "60 × 25 × 50 cm",  "es_base": False},
            "M":  {"dimensiones": "90 × 30 × 60 cm",  "es_base": True},
            "L":  {"dimensiones": "120 × 35 × 70 cm", "es_base": False},
            "XL": {"dimensiones": "160 × 38 × 80 cm", "es_base": False},
        },
        orden=9, sku_ref="332640",
    ),

    make_item(
        id_="ACA-BAR-003", nombre="CAVA Wine", ref="332640-W",
        family="Bar & Bodega", linea="Bar & Bodega",
        categoria="Vinoteca Mural con Iluminación",
        descripcion="Vinoteca mural de marco negro con bastidores de madera para 24 botellas e iluminación LED.",
        tagline="Cada botella, una obra.",
        specs={
            "Dimensiones (L)": "120 × 25 × 100 cm",
            "Capacidad (L)": "24 botellas",
            "Marco": "Acero laminado negro matte",
            "Bastidores": "Madera torneada nogal o roble",
            "Iluminación": "LED ambar 2700K travesaño superior",
            "Instalación": "Mural — anclaje perimetral al marco",
        },
        prices=prices_por_talla(None, "Marco negro + Bastidores madera"),
        material_principal="Marco Negro + Bastidores Nogal",
        acabado="Negro matte exterior + madera natural en bastidores",
        iluminacion="Sí — tira LED ambar 2700K en travesaño superior",
        instalacion="Mural (pared) — anclaje perimetral",
        talla_base="L",
        tallas={
            "S":  {"dimensiones": "60 × 20 × 80 cm (12 bot.)",  "es_base": False},
            "M":  {"dimensiones": "90 × 22 × 90 cm (18 bot.)",  "es_base": False},
            "L":  {"dimensiones": "120 × 25 × 100 cm (24 bot.)","es_base": True},
            "XL": {"dimensiones": "160 × 28 × 110 cm (36 bot.)","es_base": False},
        },
        orden=10, sku_ref="332640-W",
    ),

    # ══════════════════════════════════════════════════════════════════════════
    # LÍNEA: MESAS DE NOCHE  — FLAGSHIP
    # ══════════════════════════════════════════════════════════════════════════
    make_item(
        id_="ACA-MDN-001", nombre="MIKOLOS", ref="125734",
        family="Mesas de Noche", linea="Mesas de Noche",
        categoria="Mesa de Noche Flotante con Iluminación",
        descripcion="Mesa de noche flotante en nogal con cajón superior y nicho LED ambar proyectado al suelo.",
        tagline="La noche empieza despacio.",
        specs={
            "Dimensiones (M)": "55 × 40 × 40 cm",
            "Material": "Nogal americano macizo",
            "Acabado": "Aceite penetrante mate",
            "Iluminación": "LED ambar 2700K — proyectada al suelo",
            "Instalación": "Flotante — perfil metálico oculto",
            "Piezas": "1 cajón nogal con tirador canal, 1 nicho LED inferior",
        },
        prices=prices_por_talla(None, "Nogal americano"),
        material_principal="Nogal Americano",
        acabado="Nogal natural con aceite penetrante mate",
        iluminacion="Sí — tira LED ambar 2700K nicho inferior proyectada al suelo",
        instalacion="Flotante (pared) — perfil metálico oculto",
        talla_base="M",
        tallas={
            "S":  {"dimensiones": "45 × 35 × 35 cm", "es_base": False},
            "M":  {"dimensiones": "55 × 40 × 40 cm", "es_base": True},
            "L":  {"dimensiones": "65 × 45 × 45 cm", "es_base": False},
            "XL": {"dimensiones": "75 × 50 × 50 cm", "es_base": False},
        },
        orden=11, sku_ref="125734",
    ),

    make_item(
        id_="ACA-MDN-002", nombre="ESLOVIA", ref="154370",
        family="Mesas de Noche", linea="Mesas de Noche",
        categoria="Mesa de Noche con Base Metálica",
        descripcion="Mesa de noche parada en nogal con base cuadrada de acero negro y nicho LED central.",
        tagline="Calidez que se sostiene en el aire.",
        specs={
            "Dimensiones (M)": "55 × 40 × 55 cm",
            "Material cuerpo": "Laminado nogal americano",
            "Base": "Acero laminado negro matte — 4 patas cuadradas",
            "Iluminación": "LED ambar 2700K nicho central",
            "Instalación": "Piso — base metálica autoportante",
            "Piezas": "1 cajón, 1 nicho LED central, base cuadrada acero negro",
        },
        prices=prices_por_talla(None, "Nogal + Acero negro"),
        material_principal="Nogal Americano + Acero Negro",
        acabado="Nogal natural + Negro Matte RAL 9005 en base",
        iluminacion="Sí — tira LED ambar 2700K en nicho central",
        instalacion="Piso (base metálica autoportante)",
        talla_base="M",
        tallas={
            "S":  {"dimensiones": "45 × 35 × 50 cm", "es_base": False},
            "M":  {"dimensiones": "55 × 40 × 55 cm", "es_base": True},
            "L":  {"dimensiones": "65 × 45 × 62 cm", "es_base": False},
            "XL": {"dimensiones": "75 × 50 × 70 cm", "es_base": False},
        },
        orden=12, sku_ref="154370",
    ),

    make_item(
        id_="ACA-MDN-003", nombre="BALLENGCY", ref="132960",
        family="Mesas de Noche", linea="Mesas de Noche",
        categoria="Mesa de Noche Modular con Iluminación",
        descripcion="Mesa de noche modular 3 cuerpos en nogal y antracita con nicho LED central y base tapizada.",
        tagline="Tres capas. Una sola presencia.",
        specs={
            "Dimensiones (M)": "60 × 42 × 62 cm",
            "Módulos": "3 cuerpos apilados",
            "Material": "Laminado nogal americano veteado",
            "Separadores": "Estructura negro antracita mate",
            "Base": "Tapizada en textil gris antracita",
            "Iluminación": "LED ambar 2700K nicho intermedio",
            "Tiradores": "Negro matte",
        },
        prices=prices_por_talla(None, "Nogal + Antracita"),
        material_principal="Nogal Americano + Antracita",
        acabado="Nogal natural veteado + Antracita mate en separadores y base",
        iluminacion="Sí — tira LED ambar 2700K en nicho intermedio",
        instalacion="Piso (autoportante)",
        talla_base="M",
        tallas={
            "S":  {"dimensiones": "50 × 38 × 55 cm", "es_base": False},
            "M":  {"dimensiones": "60 × 42 × 62 cm", "es_base": True},
            "L":  {"dimensiones": "70 × 45 × 68 cm", "es_base": False},
            "XL": {"dimensiones": "80 × 50 × 75 cm", "es_base": False},
        },
        orden=13, sku_ref="132960",
    ),

    # ══════════════════════════════════════════════════════════════════════════
    # LÍNEA: MESAS DE CENTRO
    # ══════════════════════════════════════════════════════════════════════════
    make_item(
        id_="ACA-MCT-001", nombre="FOLSW", ref="ACA-MCT-001",
        family="Mesas de Centro", linea="Mesas de Centro",
        categoria="Mesa de Centro Industrial",
        descripcion="Mesa de centro industrial de tablero en roble y estructura perimetral de acero negro matte.",
        tagline="El centro de todo.",
        specs={
            "Dimensiones (M)": "110 × 60 × 42 cm",
            "Tablero": "Roble o nogal natural",
            "Estructura": "Acero laminado negro matte soldado (perimetral)",
            "Acabado tablero": "Barniz satinado",
            "Acabado estructura": "Negro Matte RAL 9005",
            "Instalación": "Piso — autoportante",
        },
        prices=[
            price_entry("S — Roble / Nogal",              round(1899 * 0.80)),
            price_entry("M — Roble / Nogal (Estándar)",   1899),
            price_entry("L — Roble / Nogal",              round(1899 * 1.25)),
            price_entry("XL — Roble / Nogal",             round(1899 * 1.55)),
        ],
        material_principal="Roble / Nogal + Acero Negro",
        acabado="Roble natural / Nogal + Negro Matte RAL 9005",
        iluminacion="No",
        instalacion="Piso (autoportante)",
        talla_base="M",
        tallas={
            "S":  {"dimensiones": "80 × 50 × 40 cm",  "es_base": False},
            "M":  {"dimensiones": "110 × 60 × 42 cm", "es_base": True},
            "L":  {"dimensiones": "130 × 70 × 43 cm", "es_base": False},
            "XL": {"dimensiones": "150 × 80 × 45 cm", "es_base": False},
        },
        orden=14, sku_ref="ACA-MCT-001",
    ),
]


# ── Lógica de carga ────────────────────────────────────────────────────────────
def put_item(item: dict, dry_run: bool = False) -> bool:
    """Llama a aws dynamodb put-item con el item dado."""
    payload = json.dumps({"Item": item}, ensure_ascii=False)
    cmd = [
        "aws", "dynamodb", "put-item",
        "--table-name", TABLE,
        "--region", REGION,
        "--item", payload,
    ]

    if dry_run:
        nombre = item.get("name", {}).get("S", "?")
        print(f"\n{'─'*60}")
        print(f"[DRY-RUN] {nombre}")
        print(json.dumps(item, indent=2, ensure_ascii=False)[:800], "...")
        return True

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            print(f"  ✗ ERROR: {result.stderr.strip()}")
            return False
        return True
    except subprocess.TimeoutExpired:
        print("  ✗ TIMEOUT — AWS CLI no respondió en 30s")
        return False
    except FileNotFoundError:
        print("  ✗ ERROR: AWS CLI no encontrado. Instálalo con: pip install awscli")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Seed DynamoDB — Acacia Catalog")
    parser.add_argument("--dry-run",  action="store_true", help="Muestra el payload sin subir a DynamoDB")
    parser.add_argument("--producto", type=str, default=None, help="ID del producto (ej. ACA-TV-001)")
    parser.add_argument("--linea",    type=str, default=None, help="Nombre de la linea a cargar")
    parser.add_argument("--tabla",    type=str, default=TABLE,  help="Nombre de la tabla DynamoDB")
    parser.add_argument("--region",   type=str, default=REGION, help="Region AWS")
    args = parser.parse_args()

    tbl = args.tabla
    reg = args.region

    # Filtros
    productos = CATALOG
    if args.producto:
        productos = [p for p in CATALOG if p["id"]["S"] == args.producto]
        if not productos:
            print(f"Producto no encontrado: {args.producto}")
            sys.exit(1)
    elif args.linea:
        productos = [p for p in CATALOG if p["linea"]["S"] == args.linea]
        if not productos:
            print(f"Linea no encontrada: {args.linea}")
            sys.exit(1)

    sep = "=" * 60
    print(f"\n{sep}")
    print(f"  ACACIA -- Seed DynamoDB")
    print(f"  Tabla  : {tbl}")
    print(f"  Region : {reg}")
    print(f"  Modo   : {'DRY-RUN' if args.dry_run else 'PRODUCCION'}")
    print(f"  Items  : {len(productos)} productos")
    print(f"{sep}\n")

    ok = 0
    fail = 0
    for item in productos:
        id_   = item["id"]["S"]
        name  = item["name"]["S"]
        linea = item["linea"]["S"]
        print(f"  [->] {id_:<16}  {name:<22}  ({linea})", end=" ", flush=True)

        payload = json.dumps(item, ensure_ascii=False)
        if args.dry_run:
            print()
            print(json.dumps(item, indent=2, ensure_ascii=False)[:600])
            ok += 1
            continue

        cmd = ["aws", "dynamodb", "put-item",
               "--table-name", tbl,
               "--region", reg,
               "--item", payload]
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if r.returncode == 0:
                print("OK")
                ok += 1
            else:
                print(f"ERROR: {r.stderr.strip()[:120]}")
                fail += 1
        except subprocess.TimeoutExpired:
            print("TIMEOUT")
            fail += 1
        except FileNotFoundError:
            print("ERROR: AWS CLI no encontrado")
            sys.exit(1)

    print(f"\n{sep}")
    print(f"  Resultado: {ok} OK  |  {fail} errores")
    if not args.dry_run and ok > 0:
        print(f"\n  Verifica con:")
        print(f"  aws dynamodb scan --table-name {tbl} --region {reg} --select COUNT")
    print(f"{sep}\n")


if __name__ == "__main__":
    main()
