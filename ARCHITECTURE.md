# Architecture Documentation

## File Structure

The codebase is organized using clean architecture principles with separation of concerns:

### Core Configuration
- **Config.gs** - Application configuration settings (email, calendar ID, working hours, templates, etc.)

### Constants
- **Constants.gs** - All constants, enums, and column mappings

### Services (Business Logic Layer)
- **SheetService.gs** - Google Sheets operations (reading, writing, updating)
- **CalendarService.gs** - Google Calendar operations (event creation, conference links, reminders)
- **EmailService.gs** - Email sending operations (confirmation, rejection emails)
- **SchedulingService.gs** - Scheduling logic (slot finding, date parsing, time window handling)
- **TimezoneService.gs** - Timezone utilities (detection, conversion, DST handling)
- **ValidationService.gs** - Data validation and form data extraction

### Utilities
- **Utils.gs** - General utility functions (string formatting, template replacement, date formatting, logging)

### Entry Point
- **Main.gs** - Main entry point, triggers, and orchestration logic

## Architecture Principles

### Separation of Concerns
Each service handles a specific domain:
- **SheetService**: All spreadsheet interactions
- **CalendarService**: All calendar operations
- **EmailService**: All email operations
- **SchedulingService**: Business logic for finding available slots
- **TimezoneService**: Timezone-related calculations
- **ValidationService**: Data validation and extraction

### Single Responsibility
Each file has a single, well-defined purpose.

### Dependency Flow
```
Main.gs (Entry Point)
    ↓
Services (Business Logic)
    ↓
Utils (Utilities)
    ↓
Config & Constants (Configuration)
```

## File Dependencies

```
Main.gs
├── Config.gs
├── Constants.gs
├── Utils.gs
├── SheetService.gs
├── ValidationService.gs
├── SchedulingService.gs
├── TimezoneService.gs
├── CalendarService.gs
└── EmailService.gs

SheetService.gs
├── Config.gs
├── Constants.gs
└── Utils.gs

ValidationService.gs
├── Constants.gs
├── Utils.gs
└── SheetService.gs

SchedulingService.gs
├── Config.gs
├── Constants.gs
└── TimezoneService.gs

CalendarService.gs
├── Config.gs
└── Utils.gs

EmailService.gs
├── Config.gs
└── Utils.gs
```

## Benefits of This Architecture

1. **Maintainability**: Easy to locate and modify specific functionality
2. **Testability**: Each service can be tested independently
3. **Scalability**: Easy to add new features without affecting existing code
4. **Readability**: Clear separation makes code easier to understand
5. **Reusability**: Services can be reused across different parts of the application

## Adding New Features

To add a new feature:
1. Identify which service it belongs to (or create a new service if needed)
2. Add the functionality to the appropriate service file
3. Update Main.gs if it's a new entry point or trigger

## Migration Notes

The original `SchedulingAutomation.gs` file has been renamed to `SchedulingAutomation.gs.old` for reference. All functionality has been preserved and reorganized into the new structure.

