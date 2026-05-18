from sqlalchemy.orm import DeclarativeBase



class Base(DeclarativeBase):
    """
    Base class for all tables
    """
    __abstract__ = True