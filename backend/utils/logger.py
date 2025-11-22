"""
Centralized logging utility with emoji labels and color coding
Provides consistent logging across all application components
"""
import sys
from datetime import datetime
from typing import Any, Optional
from enum import Enum


class LogLevel(Enum):
    """Log levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    SUCCESS = "SUCCESS"


# ANSI color codes for terminal output
class Colors:
    RESET = '\x1b[0m'
    BRIGHT = '\x1b[1m'
    DIM = '\x1b[2m'
    
    # Foreground colors
    RED = '\x1b[31m'
    GREEN = '\x1b[32m'
    YELLOW = '\x1b[33m'
    BLUE = '\x1b[34m'
    MAGENTA = '\x1b[35m'
    CYAN = '\x1b[36m'
    WHITE = '\x1b[37m'


# Component configurations with emoji and color
COMPONENT_CONFIG = {
    'BACKGROUND': {'emoji': '🌄', 'color': Colors.BLUE, 'name': 'BACKGROUND'},
    'CHARACTER': {'emoji': '🎭', 'color': Colors.MAGENTA, 'name': 'CHARACTER'},
    'MACRO_CHAIN': {'emoji': '🔗', 'color': Colors.CYAN, 'name': 'MACRO_CHAIN'},
    'SCENE': {'emoji': '🎬', 'color': Colors.GREEN, 'name': 'SCENE'},
    'CONTEXT': {'emoji': '🧠', 'color': Colors.YELLOW, 'name': 'CONTEXT'},
    'STORAGE': {'emoji': '💾', 'color': Colors.WHITE, 'name': 'STORAGE'},
    'API': {'emoji': '🌐', 'color': Colors.CYAN, 'name': 'API'},
    'AI': {'emoji': '🤖', 'color': Colors.MAGENTA, 'name': 'AI'},
    'LOCK': {'emoji': '🔒', 'color': Colors.RED, 'name': 'LOCK'},
    'VALIDATION': {'emoji': '✅', 'color': Colors.GREEN, 'name': 'VALIDATION'},
    'PROMPT': {'emoji': '📝', 'color': Colors.BLUE, 'name': 'PROMPT'},
    'SERVER': {'emoji': '⚙️', 'color': Colors.WHITE, 'name': 'SERVER'},
    'ERROR': {'emoji': '❌', 'color': Colors.RED, 'name': 'ERROR'},
}

# Log level configurations
LOG_LEVELS = {
    LogLevel.DEBUG: {'emoji': '🔍', 'color': Colors.DIM, 'name': 'DEBUG'},
    LogLevel.INFO: {'emoji': 'ℹ️', 'color': Colors.WHITE, 'name': 'INFO'},
    LogLevel.WARN: {'emoji': '⚠️', 'color': Colors.YELLOW, 'name': 'WARN'},
    LogLevel.ERROR: {'emoji': '❌', 'color': Colors.RED, 'name': 'ERROR'},
    LogLevel.SUCCESS: {'emoji': '✅', 'color': Colors.GREEN, 'name': 'SUCCESS'},
}


def get_timestamp() -> str:
    """Format timestamp for logs"""
    now = datetime.now()
    return now.strftime("%H:%M:%S.%f")[:-3]


def create_logger(component: str):
    """Create a logger for a specific component"""
    config = COMPONENT_CONFIG.get(component, COMPONENT_CONFIG['API'])
    
    class Logger:
        def __init__(self, component_name: str):
            self.component = component_name
            self.config = COMPONENT_CONFIG.get(component_name, COMPONENT_CONFIG['API'])
        
        def _log(self, level: LogLevel, *args: Any, use_stderr: bool = False):
            """Internal log method"""
            level_config = LOG_LEVELS[level]
            timestamp = get_timestamp()
            
            output = sys.stderr if use_stderr else sys.stdout
            
            print(
                f"{Colors.DIM}[{timestamp}]{Colors.RESET}",
                f"{self.config['emoji']} {self.config['color']}{self.config['name']}{Colors.RESET}",
                f"{level_config['emoji']} {level_config['color']}{level_config['name']}{Colors.RESET}",
                *args,
                file=output
            )
        
        def debug(self, *args: Any):
            """Log debug information"""
            self._log(LogLevel.DEBUG, *args)
        
        def info(self, *args: Any):
            """Log general information"""
            self._log(LogLevel.INFO, *args)
        
        def warn(self, *args: Any):
            """Log warnings"""
            self._log(LogLevel.WARN, *args, use_stderr=True)
        
        def error(self, *args: Any):
            """Log errors"""
            self._log(LogLevel.ERROR, *args, use_stderr=True)
        
        def success(self, *args: Any):
            """Log success messages"""
            self._log(LogLevel.SUCCESS, *args)
        
        def custom(self, emoji: str, *args: Any):
            """Log with custom emoji and message"""
            timestamp = get_timestamp()
            print(
                f"{Colors.DIM}[{timestamp}]{Colors.RESET}",
                f"{self.config['emoji']} {self.config['color']}{self.config['name']}{Colors.RESET}",
                emoji,
                *args
            )
        
        def separator(self, char: str = '─', length: int = 80):
            """Log a separator line"""
            print(f"{self.config['color']}{char * length}{Colors.RESET}")
        
        def section(self, title: str):
            """Log a section header"""
            print(f"\n{self.config['color']}{'═' * 80}{Colors.RESET}")
            print(
                f"{self.config['emoji']} {self.config['color']}{self.config['name']}{Colors.RESET}",
                f"{Colors.BRIGHT}{title}{Colors.RESET}"
            )
            print(f"{self.config['color']}{'═' * 80}{Colors.RESET}\n")
    
    return Logger(component)


# Create loggers for all components
loggers = {
    'background': create_logger('BACKGROUND'),
    'character': create_logger('CHARACTER'),
    'macroChain': create_logger('MACRO_CHAIN'),
    'scene': create_logger('SCENE'),
    'context': create_logger('CONTEXT'),
    'storage': create_logger('STORAGE'),
    'api': create_logger('API'),
    'ai': create_logger('AI'),
    'lock': create_logger('LOCK'),
    'validation': create_logger('VALIDATION'),
    'prompt': create_logger('PROMPT'),
    'server': create_logger('SERVER'),
    'error': create_logger('ERROR'),
}

# Export default logger
logger = loggers

