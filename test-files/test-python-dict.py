# Python dictionary that needs to be converted to JSON
config = {
    'name': 'test-app',
    'version': '1.0.0',
    'debug': True,
    'database': {
        'host': 'localhost',
        'port': 5432,
        'ssl': False,
        'options': None
    },
    'features': ['auth', 'logging', 'cache'],
    'settings': {
        'timeout': 30,
        'retries': 3,
        'enabled': True
    }
}