from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, test_db_connection
from .auth import router as auth_router
from .routers.users import router as users_router
from .routers.files import router as files_router

app = FastAPI()

# CORS middleware - allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Test database connection on startup
test_db_connection()

# Create all tables
Base.metadata.create_all(bind=engine)


@app.get("/")
def read_root():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(files_router)

