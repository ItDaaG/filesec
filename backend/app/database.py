from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL

# The engine is the "bridge" to the DB
# pool_pre_ping ensures connections are valid before use
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using them
    echo=False  # Set to True for SQL query logging (useful for debugging)
)

# Each instance of SessionLocal will be a database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# The base class for your models to inherit from
Base = declarative_base()

# Dependency to get a DB session for a specific request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_db_connection():
    """Test if the database connection is working."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        print("✅ Database connection successful!")
        return True
    except Exception as e:
        error_msg = str(e)
        print(f"Database connection failed: {error_msg}")
        return False
