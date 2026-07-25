
# Full Stack Health Tracker Course Syllabus

## Course Objective

Build and deploy a private, multi user health tracking application using:

**Backend**

* Python
* FastAPI
* Pydantic
* SQLAlchemy
* PostgreSQL
* Alembic
* JWT authentication

**Frontend**

* TypeScript
* Qwik
* Qwik City
* Tailwind CSS
* A charting library compatible with Qwik

**Infrastructure**

* Git and GitHub
* Linode VPS
* Dokku
* Dokku PostgreSQL
* Custom domains
* Let’s Encrypt SSL

By the end of the course, the completed application will allow users to:

* Register and log in
* Maintain private, isolated accounts
* Log foods and meals
* Track calories, protein, carbohydrates, and fat
* Record weight, mood, and sleep
* Review daily totals
* Browse previous days
* Filter records by date range
* View health trends on charts
* Configure personal goals
* Save quick add food templates
* Export personal data
* Use the application on desktop and mobile
* Switch between light and dark mode
* Run the entire application on a private Linode server

---

# Course Structure

The course is divided into 20 modules.

Each module contains:

* Lessons
* Learning goals
* App features to build
* Technical concepts
* Completion checkpoints
* Optional practice work

The application will be built incrementally. Every lesson should leave the project in a working state.

---

# Module 1: Understanding the Application

## Lesson 1.1: Defining the Product

### Learning goals

* Understand what the app will do
* Separate required features from optional features
* Identify the different types of users and data
* Define what the first usable release must contain

### Topics

* Product requirements
* Functional requirements
* Nonfunctional requirements
* Minimum viable product
* Future enhancements
* Privacy expectations
* Multi user requirements
* Mobile and desktop requirements

### App planning work

Create a feature inventory containing:

* Authentication
* Food logging
* Daily nutrition summary
* Weight tracking
* Mood tracking
* Sleep tracking
* History
* Charts
* Goals
* Templates
* Export
* Dark mode
* Account management

### Completion checkpoint

You can clearly describe:

* Who the app is for
* What problem it solves
* What belongs in version one
* What can wait until later

---

## Lesson 1.2: Mapping the User Experience

### Learning goals

* Understand how users move through the app
* Identify the screens that must be built
* Define common user actions

### User flows

Map the following flows:

1. Register a new account
2. Log in
3. View today’s dashboard
4. Add a food entry
5. Edit a food entry
6. Delete a food entry
7. Record weight
8. Record mood
9. Record sleep
10. View a previous date
11. Review a weekly chart
12. Change daily nutrition goals
13. Create a quick add template
14. Export data
15. Log out

### Proposed screens

* Landing page
* Registration page
* Login page
* Today dashboard
* Add food page or modal
* Edit food page or modal
* History page
* Analytics page
* Quick add templates page
* Settings page
* Account page
* Error and not found pages

### Completion checkpoint

Every core feature has a corresponding screen and user flow.

---

## Lesson 1.3: Understanding the Full Stack Architecture

### Learning goals

* Understand the responsibilities of the frontend, backend, and database
* Understand how an HTTP request moves through the system
* Understand why the backend and frontend will be separate applications

### Topics

* Browser
* Qwik frontend
* FastAPI backend
* PostgreSQL database
* HTTP and HTTPS
* JSON
* REST APIs
* Authentication tokens
* Domain names
* Reverse proxies
* Server processes

### Example request flow

Study the conceptual flow of adding a food entry:

1. User submits a form in Qwik
2. Qwik validates basic form input
3. The frontend sends an authenticated request
4. FastAPI receives the request
5. FastAPI verifies the user
6. Pydantic validates the submitted data
7. SQLAlchemy creates a database record
8. PostgreSQL stores the entry
9. FastAPI returns a response
10. Qwik refreshes the daily summary

### Completion checkpoint

You can explain which layer is responsible for validation, security, storage, and presentation.

---

# Module 2: Development Environment and Tools

## Lesson 2.1: Installing the Core Tools

### Learning goals

* Prepare a local development environment
* Understand the role of each tool

### Required tools

* Git
* Python
* Python package and environment manager
* Node.js
* Node package manager
* PostgreSQL
* Code editor
* API testing tool
* Database inspection tool
* Terminal

### Concepts

* Runtime
* Package manager
* Dependency
* Development dependency
* Command line interface
* Environment variables
* Local service
* Port
* Process

### Completion checkpoint

You can run:

* Python
* Node.js
* PostgreSQL
* Git
* Your code editor
* An API client

---

## Lesson 2.2: Command Line Fundamentals

### Learning goals

* Become comfortable navigating a project from the terminal
* Understand file paths and shell commands

### Topics

* Current directory
* Parent and child directories
* Absolute paths
* Relative paths
* Creating files and folders
* Moving and renaming files
* Viewing directory contents
* Running commands
* Stopping processes
* Reading error output
* Environment variables
* Command history

### Practice work

Create a temporary project folder and practice:

* Navigating into it
* Creating folders
* Creating files
* Renaming files
* Removing files
* Running a local process
* Stopping the process

---

## Lesson 2.3: Git Fundamentals

### Learning goals

* Use version control from the beginning
* Understand how changes move from working files into project history

### Topics

* Repository
* Working tree
* Staging area
* Commit
* Branch
* Remote
* Push
* Pull
* Merge
* Conflict
* Ignore file

### Project work

Create the main project repository and establish:

* A backend directory
* A frontend directory
* A project documentation directory
* A root README
* A Git ignore strategy

### Suggested commit milestones

* Initial project structure
* Backend initialized
* Database configured
* Authentication completed
* Food logging completed
* Frontend initialized
* Dashboard connected
* Deployment configured

### Completion checkpoint

You can create commits, inspect history, and recover from a simple mistake.

---

# Module 3: Programming Foundations

## Lesson 3.1: Python Fundamentals for FastAPI

### Learning goals

* Learn the Python concepts required for the backend
* Understand how Python organizes data and behavior

### Topics

* Variables
* Strings
* Integers
* Floating point values
* Booleans
* Lists
* Dictionaries
* Tuples
* Conditional statements
* Loops
* Functions
* Return values
* Exceptions
* Imports
* Modules
* Packages

### Health tracker exercises

Practice reasoning about:

* A calorie total
* A list of food entries
* A dictionary representing a meal
* A function that calculates daily protein
* Validation of a mood score
* Handling a missing weight entry

---

## Lesson 3.2: Python Type Hints

### Learning goals

* Understand why FastAPI relies heavily on typing
* Learn to describe expected input and output types

### Topics

* Primitive type annotations
* Lists and dictionaries
* Optional values
* Union types
* Function parameter types
* Return types
* Class attributes
* Type aliases

### Health tracker applications

Define conceptual types for:

* User identifiers
* Dates
* Calorie values
* Macro values
* Mood scores
* Sleep quality scores
* Optional notes

### Completion checkpoint

You can read a typed Python function and explain what values it accepts and returns.

---

## Lesson 3.3: Object Oriented Python

### Learning goals

* Understand classes before using ORM models and Pydantic models
* Distinguish classes from instances

### Topics

* Classes
* Objects
* Attributes
* Methods
* Constructors
* Inheritance
* Composition
* Class responsibility
* Data models

### Health tracker exercises

Design conceptual classes for:

* User
* Food entry
* Weight entry
* Mood entry
* Sleep entry
* Daily goal

---

## Lesson 3.4: JavaScript and TypeScript Fundamentals

### Learning goals

* Learn the language concepts required for Qwik
* Understand the value of TypeScript

### Topics

* Variables
* Primitive values
* Arrays
* Objects
* Functions
* Arrow functions
* Conditional logic
* Array transformations
* Modules
* Imports and exports
* Promises
* Async operations
* Interfaces
* Type aliases
* Optional properties
* Union types
* Generics

### Health tracker exercises

Model:

* A food entry object
* A daily summary object
* An API response
* A login form
* A chart data point

---

## Lesson 3.5: Asynchronous Programming

### Learning goals

* Understand why web applications perform asynchronous work
* Recognize where asynchronous behavior occurs

### Topics

* Blocking work
* Nonblocking work
* Promises
* Async and await
* Network requests
* Database operations
* Error handling in asynchronous operations
* Loading states

### Health tracker examples

* Waiting for login
* Loading today’s food entries
* Submitting a meal
* Refreshing chart data
* Exporting records

---

# Module 4: HTTP, APIs, and REST

## Lesson 4.1: How HTTP Works

### Learning goals

* Understand communication between the browser and FastAPI
* Learn the anatomy of requests and responses

### Topics

* URL
* Domain
* Path
* Query parameter
* Request header
* Request body
* Response body
* HTTP method
* Status code
* Content type
* Cookies
* Authorization header

### Important methods

* GET
* POST
* PUT
* PATCH
* DELETE

### Important status code groups

* Successful responses
* Client errors
* Authentication errors
* Authorization errors
* Validation errors
* Server errors

---

## Lesson 4.2: RESTful API Design

### Learning goals

* Design predictable API routes
* Distinguish resources from actions

### Initial API resource groups

* Authentication
* Users
* Food entries
* Weight entries
* Mood entries
* Sleep entries
* Daily summaries
* Analytics
* Goals
* Templates
* Exports

### Design decisions

For each resource, define:

* Collection endpoint
* Individual record endpoint
* Supported methods
* Request body
* Response body
* Validation rules
* Authentication requirements
* Ownership requirements

### Completion checkpoint

Produce an API route inventory before writing the full backend.

---

## Lesson 4.3: JSON and Data Contracts

### Learning goals

* Understand how the backend and frontend agree on data structures
* Recognize breaking and nonbreaking API changes

### Topics

* JSON objects
* JSON arrays
* Numbers
* Strings
* Booleans
* Null
* Nested data
* Date formatting
* Decimal values
* Error response shapes

### Project decision

Establish consistent response formats for:

* Single records
* Collections
* Validation errors
* Authentication errors
* Summary data
* Chart data

---

# Module 5: Starting the FastAPI Backend

## Lesson 5.1: Creating the Backend Project

### Learning goals

* Initialize the Python application
* Create an isolated dependency environment
* Understand backend project boundaries

### Project structure concepts

* Application package
* Main application entry point
* API routers
* Models
* Schemas
* Services
* Database configuration
* Security utilities
* Application settings
* Tests
* Migration files

### Completion checkpoint

The backend starts locally and returns a basic response.

---

## Lesson 5.2: FastAPI Application Fundamentals

### Learning goals

* Understand FastAPI route operations
* Learn how requests are connected to Python functions

### Topics

* Application instance
* Path operation
* Route decorator
* Request parameters
* Response model
* Automatic documentation
* OpenAPI schema
* Swagger interface
* Application startup
* Development server

### Project work

Create conceptual endpoints for:

* Root API information
* Health status
* API version information

### Completion checkpoint

You can open the generated API documentation and test an endpoint.

---

## Lesson 5.3: Pydantic Models

### Learning goals

* Validate incoming data
* Control outgoing data
* Separate API schemas from database models

### Schema categories

* Base schema
* Creation schema
* Update schema
* Response schema
* Internal schema

### Health tracker validation rules

Plan rules for:

* Email format
* Password length
* Food name length
* Calories greater than or equal to zero
* Macro values greater than or equal to zero
* Mood between 1 and 10
* Sleep quality between 1 and 10
* Sleep duration within a reasonable range
* Weight greater than zero
* Notes length
* Valid dates and timestamps

### Completion checkpoint

Invalid data produces clear validation responses.

---

## Lesson 5.4: Routers and Application Organization

### Learning goals

* Split a growing API into manageable files
* Apply prefixes and tags

### Router groups

* Authentication router
* User router
* Food router
* Weight router
* Mood router
* Sleep router
* Summary router
* Analytics router
* Goal router
* Template router
* Export router

### Completion checkpoint

The application entry point remains small while routes are organized by feature.

---

## Lesson 5.5: FastAPI Dependency Injection

### Learning goals

* Understand reusable request level dependencies
* Prepare for database sessions and authentication

### Dependency examples

* Database session
* Current user
* Pagination settings
* Date range validation
* Application configuration
* Administrative permission
* Rate limit information

### Completion checkpoint

You can explain why dependencies are preferable to repeating setup logic in every route.

---

# Module 6: PostgreSQL and Relational Data

## Lesson 6.1: Relational Database Fundamentals

### Learning goals

* Understand how PostgreSQL stores application data
* Learn basic relational terminology

### Topics

* Database
* Schema
* Table
* Row
* Column
* Primary key
* Foreign key
* Unique constraint
* Nullability
* Index
* Relationship
* Transaction

### Health tracker tables

Plan the following tables:

* Users
* Food entries
* Weight entries
* Mood entries
* Sleep entries
* User goals
* Food templates
* Refresh tokens or sessions, depending on authentication design

---

## Lesson 6.2: Data Modeling the Health Tracker

### Learning goals

* Translate app requirements into tables
* Avoid unnecessary duplication
* Define ownership relationships

### User table concepts

* Unique identifier
* Email
* Password hash
* Display name
* Active status
* Creation timestamp
* Update timestamp

### Food entry concepts

* Entry identifier
* User identifier
* Food name
* Meal category
* Quantity or serving description
* Calories
* Protein
* Carbohydrates
* Fat
* Entry date
* Optional notes
* Creation timestamp
* Update timestamp

### Weight entry concepts

* Entry identifier
* User identifier
* Weight in pounds
* Measurement date
* Optional notes

### Mood entry concepts

* Entry identifier
* User identifier
* Score
* Entry date
* Optional notes

### Sleep entry concepts

* Entry identifier
* User identifier
* Hours slept
* Quality score
* Sleep date
* Optional notes

### Goal concepts

* User identifier
* Daily calorie goal
* Protein goal
* Carbohydrate goal
* Fat goal
* Optional weight goal

### Completion checkpoint

Create an entity relationship diagram showing all tables and ownership relationships.

---

## Lesson 6.3: Data Types and Precision

### Learning goals

* Choose appropriate PostgreSQL data types
* Understand precision problems with health data

### Topics

* Integer
* Decimal or numeric
* Text
* Boolean
* Date
* Timestamp
* Timestamp with time zone
* Universally unique identifiers
* Enumerated values
* JSON fields

### Decisions

Determine how to store:

* Partial pounds
* Fractional sleep hours
* Macro values with decimals
* Dates without times
* Audit timestamps
* Time zones

---

## Lesson 6.4: Constraints and Indexes

### Learning goals

* Protect data integrity at the database level
* Improve common query performance

### Constraints

Plan constraints for:

* Unique email addresses
* Valid score ranges
* Positive weight values
* Nonnegative nutrition values
* Required ownership fields

### Index candidates

* User email
* User and entry date
* User and creation timestamp
* User and measurement date
* Template owner
* Active session lookup

### Completion checkpoint

You can explain which rules belong in the database and which belong in application validation.

---

# Module 7: SQLAlchemy

## Lesson 7.1: SQLAlchemy Architecture

### Learning goals

* Understand the role of the ORM
* Distinguish SQLAlchemy models from Pydantic schemas

### Topics

* Engine
* Connection
* Session
* Transaction
* Declarative model
* Table mapping
* Query
* Commit
* Rollback
* Refresh
* Relationship loading

The course should use SQLAlchemy 2 style querying and session patterns rather than relying on older legacy query patterns.

---

## Lesson 7.2: Database Configuration

### Learning goals

* Connect FastAPI to PostgreSQL
* Manage database URLs securely
* Create request scoped sessions

### Topics

* Database connection string
* Development database
* Test database
* Production database
* Connection pooling
* Session lifecycle
* Commit behavior
* Rollback behavior
* Connection cleanup

### Completion checkpoint

The backend can connect to PostgreSQL and perform a basic database operation.

---

## Lesson 7.3: Building ORM Models

### Learning goals

* Define tables as Python classes
* Create relationships between records

### Models to create

* User
* FoodEntry
* WeightEntry
* MoodEntry
* SleepEntry
* UserGoal
* FoodTemplate
* AuthenticationSession, when applicable

### Model conventions

Establish consistent rules for:

* Primary keys
* Foreign keys
* Naming
* Timestamps
* Relationships
* Cascading deletes
* Indexes
* String lengths

---

## Lesson 7.4: CRUD Operations

### Learning goals

* Create, read, update, and delete records
* Use transactions correctly

### Operations to practice

* Create a user
* Find a user by email
* Create a food entry
* List entries for a particular date
* Update an entry
* Delete an entry
* Create or update a daily goal
* Find the latest weight entry

### Completion checkpoint

Each core model can be manipulated independently before API routes are added.

---

## Lesson 7.5: Relationships and User Ownership

### Learning goals

* Understand one to many relationships
* Prevent accidental cross user access

### Ownership rule

Every health record must be associated with one user.

Every user scoped query must include both:

* The record identifier or search condition
* The authenticated user identifier

### Security exercises

Review the risks of:

* Looking up a record by its ID alone
* Accepting a user ID from the request body
* Allowing the frontend to decide ownership
* Returning another user’s records
* Updating or deleting without an ownership filter

---

# Module 8: Alembic Database Migrations

## Lesson 8.1: Why Migrations Matter

### Learning goals

* Understand how database schemas evolve
* Avoid rebuilding the database after every change

### Topics

* Migration history
* Revision
* Upgrade
* Downgrade
* Current revision
* Migration chain
* Schema drift
* Production safety

---

## Lesson 8.2: Configuring Alembic

### Learning goals

* Connect Alembic to the SQLAlchemy models
* Configure environment based database URLs
* Establish a migration directory

Alembic maintains ordered database revisions and supports generating and applying migration scripts as the schema changes.

### Completion checkpoint

Alembic recognizes the project metadata and database.

---

## Lesson 8.3: Creating the Initial Migration

### Learning goals

* Generate the first database schema
* Review migration output before applying it

### Review checklist

* Table names
* Column types
* Nullability
* Primary keys
* Foreign keys
* Unique constraints
* Indexes
* Default values
* Downgrade behavior

### Completion checkpoint

A fresh PostgreSQL database can be created entirely from migration history.

---

## Lesson 8.4: Practicing Schema Changes

### Learning goals

* Safely modify an existing database
* Understand data migrations versus schema migrations

### Practice changes

* Add a notes column
* Add a meal category
* Add a goal field
* Change a nullable field
* Create an index
* Rename a field
* Add an existing row backfill

### Completion checkpoint

You can upgrade, downgrade, and recreate the database from scratch.

---

# Module 9: Authentication and Security

## Lesson 9.1: Authentication Concepts

### Learning goals

* Distinguish authentication from authorization
* Understand session based and token based systems

### Topics

* Identity
* Credentials
* Password hashing
* Access token
* Refresh token
* Token expiration
* Token revocation
* Bearer authentication
* JWT signature
* Claims
* Logout
* Account lockout
* Rate limiting

### Important distinction

A JWT is signed, not encrypted. Sensitive information should not be stored in its payload.

---

## Lesson 9.2: Password Security

### Learning goals

* Never store plain text passwords
* Understand modern password hashing

### Topics

* Password hash
* Salt
* Password verification
* Hashing cost
* Password length
* Credential stuffing
* Brute force protection
* Generic login error messages

### Account rules

Define:

* Minimum password standards
* Maximum password length handling
* Email normalization
* Duplicate registration behavior
* Login failure responses

---

## Lesson 9.3: User Registration

### Learning goals

* Build the account creation workflow
* Protect internal fields from user input

### Registration process

1. Accept registration data
2. Normalize the email
3. Validate the password
4. Check for an existing account
5. Hash the password
6. Create the user
7. Create default health goals
8. Return a safe user response
9. Avoid returning the password hash

### Completion checkpoint

A user can register and appears correctly in PostgreSQL.

---

## Lesson 9.4: Login and Access Tokens

### Learning goals

* Verify credentials
* Issue a signed access token
* Understand token expiration

### Login process

1. Receive credentials
2. Locate the user
3. Verify the password
4. Confirm the account is active
5. Create access token claims
6. Assign an expiration
7. Sign the token
8. Return authentication data

FastAPI’s security documentation provides standard OAuth2 bearer and JWT integration patterns that can be incorporated through dependencies.

---

## Lesson 9.5: Current User Dependency

### Learning goals

* Protect private routes
* Convert a token into an authenticated user

### Dependency process

1. Read authorization data
2. Validate token structure
3. Verify signature
4. Verify expiration
5. Extract the subject
6. Locate the user
7. Confirm the account is active
8. Provide the user to the route

### Completion checkpoint

Protected routes reject unauthenticated requests.

---

## Lesson 9.6: Refresh Tokens and Logout

### Learning goals

* Understand the limitations of access token only authentication
* Design real logout behavior

### Topics

* Short lived access tokens
* Longer lived refresh tokens
* Refresh token rotation
* Server side session records
* Token reuse detection
* Session revocation
* Logout from one device
* Logout from all devices

### Architecture decision

Choose and document one approach:

* Access token stored in a secure HTTP only cookie
* Access token held briefly in frontend memory with refresh cookie
* Another carefully justified browser session strategy

Avoid casually storing long lived authentication tokens in browser storage.

---

## Lesson 9.7: Authorization and Data Isolation

### Learning goals

* Apply ownership checks to every private resource
* Test cross account access attempts

### Required security tests

User A must not be able to:

* View User B’s entries
* Update User B’s entries
* Delete User B’s entries
* Access User B’s summary
* Access User B’s analytics
* Export User B’s data
* Use User B’s templates

### Completion checkpoint

Ownership enforcement exists in the query layer, not just in the frontend.

---

# Module 10: Food Logging API

## Lesson 10.1: Designing the Food Entry Resource

### Learning goals

* Finalize the food entry data model
* Decide what constitutes a meal or food record

### Fields to consider

* Food name
* Meal category
* Serving description
* Quantity
* Calories
* Protein
* Carbohydrates
* Fat
* Entry date
* Entry time
* Notes

### Product decisions

Decide:

* Whether one entry represents a food or full meal
* Whether time is required
* Whether meal categories are fixed
* Whether decimal macro values are allowed
* Whether zero calorie entries are valid

---

## Lesson 10.2: Creating Food Entries

### Learning goals

* Accept and validate new nutrition records
* Automatically assign ownership

### Route responsibilities

* Authenticate the user
* Validate nutrition values
* Assign the authenticated user ID
* Store the entry
* Return the created record
* Never trust a submitted owner ID

---

## Lesson 10.3: Listing Entries by Date

### Learning goals

* Filter records by user and date
* Return records in a stable order

### Query requirements

* Current user only
* Requested date
* Consistent sorting
* Optional meal category filter
* Predictable empty response

---

## Lesson 10.4: Updating and Deleting Food Entries

### Learning goals

* Perform ownership scoped mutations
* Distinguish full and partial updates

### Topics

* PUT versus PATCH
* Partial update schemas
* Missing record responses
* Unauthorized record behavior
* Deletion responses
* Audit timestamps

### Completion checkpoint

The complete food entry CRUD cycle works through the API documentation.

---

# Module 11: Additional Health Tracking APIs

## Lesson 11.1: Weight Tracking

### Learning goals

* Build weight entry CRUD operations
* Retrieve the latest measurement

### Features

* Add weight
* Edit weight
* Delete weight
* List weight history
* Get latest weight
* Filter by date range

### Decisions

* One weight per day versus multiple entries
* Measurement timestamp versus date
* Duplicate entry behavior
* Decimal precision

---

## Lesson 11.2: Mood Tracking

### Learning goals

* Store subjective scores and notes
* Validate bounded numeric scales

### Features

* Record mood score
* Add optional notes
* Edit today’s mood
* View mood history
* Calculate average mood

---

## Lesson 11.3: Sleep Tracking

### Learning goals

* Model sleep records carefully
* Handle dates that cross midnight

### Features

* Record hours slept
* Record sleep quality
* Add notes
* Update records
* View sleep history
* Calculate averages

### Product decision

Define whether a sleep record belongs to:

* The night sleep started
* The morning the user woke
* A separate start and end timestamp

Document the decision consistently.

---

## Lesson 11.4: Unified Daily Wellness Status

### Learning goals

* Combine multiple resource types
* Design a frontend friendly response

### Daily wellness response

Include:

* Latest applicable weight
* Mood for the selected date
* Sleep for the selected date
* Whether each record exists
* Entry identifiers needed for editing

---

# Module 12: Daily Summary and Aggregation

## Lesson 12.1: Nutrition Totals

### Learning goals

* Aggregate multiple database rows
* Understand database versus application calculations

### Totals

* Calories
* Protein
* Carbohydrates
* Fat
* Number of entries

### Groupings

* Total for the day
* Total by meal category
* Goal remaining
* Percentage of goal consumed

---

## Lesson 12.2: Daily Dashboard Endpoint

### Learning goals

* Design a purpose built summary endpoint
* Reduce unnecessary frontend requests

### Suggested response sections

* Selected date
* Nutrition totals
* Nutrition goals
* Progress values
* Food entries
* Meal groupings
* Latest weight
* Mood
* Sleep

### Completion checkpoint

One authenticated request can provide the core information needed for the dashboard.

---

## Lesson 12.3: Date and Time Zone Handling

### Learning goals

* Avoid records appearing on the wrong day
* Separate dates from timestamps

### Topics

* UTC
* User local time
* Date only fields
* Timestamp fields
* Day boundaries
* Daylight saving time
* Server time zone
* Browser time zone

### Architecture decision

Define:

* How user time zones are stored
* How “today” is determined
* Which dates come from the frontend
* Which timestamps are generated by the backend

---

# Module 13: History and Analytics API

## Lesson 13.1: Date Range Queries

### Learning goals

* Validate start and end dates
* Limit oversized queries
* Build reusable range filtering

### Rules

* Start date cannot be after end date
* Maximum range should be documented
* Empty ranges should return predictable results
* Every query must remain user scoped

---

## Lesson 13.2: Nutrition Trend Data

### Learning goals

* Aggregate records by day
* Return chart ready data

### Chart series

* Daily calories
* Daily protein
* Daily carbohydrates
* Daily fat
* Goal comparison

### Missing date decisions

Choose whether to:

* Omit days without entries
* Include days with zero values
* Mark days as missing

---

## Lesson 13.3: Weight Trends

### Learning goals

* Return ordered measurement history
* Understand smoothing and averages

### Potential values

* Daily measurement
* Weekly average
* Change from previous entry
* Change across selected range
* Goal reference line

Avoid presenting smoothing or estimated values as raw measurements.

---

## Lesson 13.4: Mood and Sleep Trends

### Learning goals

* Combine subjective and objective health metrics
* Return multiple compatible chart series

### Possible series

* Mood score
* Sleep quality
* Sleep duration
* Average mood
* Average sleep quality
* Average sleep duration

---

## Lesson 13.5: Analytics Summary Endpoint

### Learning goals

* Produce a useful range summary
* Separate aggregate statistics from raw chart points

### Summary values

* Average daily calories
* Average macros
* Weight change
* Average mood
* Average sleep duration
* Average sleep quality
* Number of tracked days
* Number of complete days

---

# Module 14: Backend Quality and Testing

## Lesson 14.1: Error Handling

### Learning goals

* Produce safe, consistent API errors
* Avoid exposing internal exceptions

### Error categories

* Validation error
* Authentication failure
* Permission failure
* Record not found
* Conflict
* Rate limit
* Database failure
* Unexpected server error

### Error response standard

Define:

* Error code
* Human readable message
* Optional field errors
* Request identifier
* Appropriate HTTP status

---

## Lesson 14.2: Logging

### Learning goals

* Record useful operational information
* Avoid logging sensitive data

### Safe logging topics

* Request path
* Response status
* Processing duration
* Application errors
* Migration events
* Authentication success or failure counts

### Information not to log

* Passwords
* Password hashes
* Full tokens
* Refresh tokens
* Sensitive notes
* Database connection passwords

---

## Lesson 14.3: Automated Testing Fundamentals

### Learning goals

* Understand unit, integration, and end to end testing
* Build tests around user behavior

### Test layers

* Schema validation tests
* Service tests
* Database tests
* API route tests
* Authentication tests
* Authorization tests
* Aggregation tests

---

## Lesson 14.4: Authentication Tests

### Test cases

* Registration succeeds
* Duplicate registration fails
* Invalid email fails
* Weak password fails
* Correct login succeeds
* Incorrect login fails
* Expired token fails
* Invalid token fails
* Logged out session fails
* Inactive user fails

---

## Lesson 14.5: Data Isolation Tests

### Test cases

* User A cannot read User B’s food
* User A cannot update User B’s food
* User A cannot delete User B’s food
* User A cannot access User B’s weight
* User A cannot access User B’s mood
* User A cannot access User B’s sleep
* User A cannot access User B’s analytics
* User A cannot export User B’s data

This is one of the most important testing lessons in the course.

---

## Lesson 14.6: Summary and Analytics Tests

### Test cases

* Empty day returns zero totals
* Single food entry totals correctly
* Multiple entries total correctly
* Meal groups total correctly
* Date filters include correct boundaries
* Missing days behave consistently
* Weight change calculation is correct
* Mood and sleep averages are correct
* Decimal values retain expected precision

---

# Module 15: Starting the Qwik Frontend

## Lesson 15.1: Understanding Qwik

### Learning goals

* Understand Qwik’s component model
* Learn the concept of resumability
* Understand server and browser execution

### Topics

* Components
* JSX and TSX
* Props
* Signals
* Stores
* Events
* Serialization
* Resumability
* Server rendering
* Client interaction

---

## Lesson 15.2: Creating the Qwik City Project

### Learning goals

* Initialize the frontend
* Understand its default directory structure

### Project areas

* Routes
* Components
* Layouts
* Styles
* Utilities
* API client
* Types
* Authentication state
* Form helpers
* Chart components

Qwik City uses directory based routing and provides layouts, route loaders, route actions, middleware, and endpoints for application development.

---

## Lesson 15.3: Qwik Components

### Learning goals

* Build reusable interface pieces
* Understand component inputs and outputs

### Initial components

* Button
* Text input
* Number input
* Text area
* Select input
* Card
* Modal
* Form error
* Loading indicator
* Empty state
* Navigation item
* Progress display

---

## Lesson 15.4: Signals and State

### Learning goals

* Manage reactive interface data
* Avoid storing unnecessary global state

### State examples

* Selected date
* Modal visibility
* Form input
* Loading state
* Current user
* Theme preference
* Dashboard response
* Active navigation tab

---

## Lesson 15.5: Qwik City Routing

### Learning goals

* Create public and protected pages
* Use layouts for shared application structure

### Route plan

* `/`
* `/register`
* `/login`
* `/app`
* `/app/history`
* `/app/analytics`
* `/app/templates`
* `/app/settings`
* `/app/account`

### Layout plan

* Public layout
* Authentication layout
* Protected app layout

---

# Module 16: Frontend Design System

## Lesson 16.1: Tailwind CSS Fundamentals

### Learning goals

* Style the app with reusable visual rules
* Understand responsive utility classes

### Topics

* Spacing
* Typography
* Borders
* Backgrounds
* Flex layouts
* Grid layouts
* Responsive breakpoints
* Hover and focus states
* Dark mode
* Reduced motion
* Form styling

---

## Lesson 16.2: Defining the Visual System

### Learning goals

* Avoid inconsistent one off styling
* Establish reusable interface standards

### Define

* Font scale
* Spacing scale
* Border radius
* Card treatment
* Form treatment
* Button hierarchy
* Status colors
* Error presentation
* Chart spacing
* Mobile navigation behavior

---

## Lesson 16.3: Responsive Application Shell

### Learning goals

* Build the main protected layout
* Support desktop and mobile navigation

### Layout elements

* Header
* Application name
* Current date
* Main navigation
* User menu
* Mobile navigation
* Main content area
* Toast or notification region

### Completion checkpoint

The shell works at common mobile, tablet, laptop, and desktop widths.

---

## Lesson 16.4: Accessibility Fundamentals

### Learning goals

* Make the application usable with keyboards and assistive technology
* Build accessible forms and dialogs

### Topics

* Semantic HTML
* Labels
* Field descriptions
* Error associations
* Keyboard navigation
* Focus visibility
* Focus trapping
* Dialog semantics
* Color contrast
* Screen reader text
* Chart alternatives
* Touch target size

---

# Module 17: Frontend Authentication

## Lesson 17.1: Registration Interface

### Learning goals

* Build a validated registration form
* Display backend errors clearly

### Form states

* Empty
* Invalid
* Submitting
* Server error
* Duplicate email
* Success
* Redirecting

---

## Lesson 17.2: Login Interface

### Learning goals

* Submit credentials securely
* Handle successful and failed login states

### Features

* Email field
* Password field
* Loading state
* Generic authentication error
* Redirect after success
* Remembered destination, where appropriate

---

## Lesson 17.3: Authentication State

### Learning goals

* Determine whether a user is logged in
* Load the current user
* Avoid showing protected data before authentication is confirmed

### Topics

* Current user endpoint
* Authenticated layout
* Session expiration
* Unauthorized API responses
* Refresh behavior
* Redirect behavior

---

## Lesson 17.4: Protected Routes

### Learning goals

* Prevent unauthenticated page access
* Understand server side versus client side redirects

### Rules

* Protected data should not be loaded for unauthenticated users
* Protected pages should redirect to login
* Login pages should redirect authenticated users into the app
* The browser interface is not the actual security boundary
* The backend must remain protected independently

Qwik middleware and route level request handling can be used for centralized concerns such as authentication checks and redirects.

---

## Lesson 17.5: Logout and Session Expiration

### Learning goals

* Provide predictable logout behavior
* Recover gracefully when a session expires

### User experience

* Explicit logout control
* Server session revocation
* Cleared authentication state
* Redirect to login
* Message explaining expiration
* No stale private data left visible

---

# Module 18: Building the Main Application Interface

## Lesson 18.1: Today Dashboard Layout

### Learning goals

* Turn the daily summary response into a useful screen
* Prioritize the most important information

### Dashboard sections

* Selected date
* Previous and next date controls
* Calorie progress
* Macro totals
* Food entries by meal
* Latest weight
* Mood
* Sleep
* Quick add controls

---

## Lesson 18.2: Food Entry Form

### Learning goals

* Build a reusable create and edit form
* Align frontend validation with backend validation

### Fields

* Food name
* Meal category
* Serving information
* Calories
* Protein
* Carbohydrates
* Fat
* Date
* Optional notes

### Form behavior

* Field validation
* Submission state
* Error handling
* Success feedback
* Dashboard refresh
* Preserve values after a failed request
* Reset after success when appropriate

---

## Lesson 18.3: Food Entry Management

### Learning goals

* Display, edit, and delete entries
* Provide safe destructive actions

### Features

* Meal grouping
* Entry details
* Edit control
* Delete control
* Confirmation
* Optimistic versus confirmed updates
* Empty day state

---

## Lesson 18.4: Weight Interface

### Learning goals

* Add and review weight measurements
* Show the latest weight without cluttering the dashboard

### Features

* Quick record form
* Latest weight card
* Previous measurement comparison
* Weight history link
* Edit and delete controls

---

## Lesson 18.5: Mood Interface

### Learning goals

* Create an easy numeric score input
* Allow optional context without forcing it

### Features

* Score selection
* Optional notes
* Current day state
* Edit behavior
* Clear visual labeling
* Accessible score controls

---

## Lesson 18.6: Sleep Interface

### Learning goals

* Capture sleep duration and quality
* Present multiple measurements clearly

### Features

* Hours slept
* Quality score
* Optional notes
* Date association
* Edit behavior
* Current day summary

---

## Lesson 18.7: Date Navigation

### Learning goals

* Allow historical logging without confusion
* Keep the selected date synchronized across the page

### Features

* Previous day
* Next day
* Today shortcut
* Date picker
* Future date rules
* Loading state during date changes
* URL based date state when appropriate

---

# Module 19: History, Charts, Goals, and Extras

## Lesson 19.1: History Page

### Learning goals

* Display past entries in a useful format
* Provide efficient filtering

### Filters

* Start date
* End date
* Record type
* Meal category
* Entry search
* Sort direction

### Display options

* Daily grouped list
* Summary cards
* Expandable day details
* Pagination or controlled date ranges
* Empty range state

---

## Lesson 19.2: Charting Fundamentals

### Learning goals

* Understand chart data structures
* Select appropriate chart types

### Chart concepts

* X axis
* Y axis
* Series
* Labels
* Tooltips
* Legends
* Reference lines
* Missing values
* Responsive sizing
* Accessible summary

### Chart choices

* Line chart for weight
* Line or bar chart for calories
* Multi series chart for macros
* Line chart for mood
* Line or bar chart for sleep

---

## Lesson 19.3: Nutrition Analytics Screen

### Learning goals

* Visualize calorie and macro trends
* Compare intake with personal goals

### Features

* Date range selector
* Calories chart
* Macronutrient chart
* Average daily values
* Number of logged days
* Goal reference
* Loading and empty states

---

## Lesson 19.4: Wellness Analytics Screen

### Learning goals

* Present weight, mood, and sleep trends
* Avoid misleading combinations of unrelated scales

### Features

* Weight trend
* Mood trend
* Sleep duration trend
* Sleep quality trend
* Summary statistics
* Separate charts where scales differ substantially

---

## Lesson 19.5: Daily Goals

### Learning goals

* Let each user personalize dashboard targets
* Build create or update settings behavior

### Goal fields

* Calories
* Protein
* Carbohydrates
* Fat
* Optional target weight

### Features

* Settings form
* Default values
* Validation
* Reset behavior
* Dashboard progress calculation

---

## Lesson 19.6: Quick Add Templates

### Learning goals

* Reduce repetitive data entry
* Reuse food data safely

### Template fields

* Template name
* Food name
* Meal category
* Serving description
* Calories
* Protein
* Carbohydrates
* Fat

### Features

* Create template
* Edit template
* Delete template
* Apply template
* Adjust values before saving
* List recent or favorite templates

---

## Lesson 19.7: Data Export

### Learning goals

* Allow users to retrieve their own data
* Understand downloadable responses

### Export options

* CSV
* JSON
* Selected date range
* Selected record types
* Full account export

### Security requirements

* Export only the authenticated user’s records
* Limit oversized export requests
* Avoid placing sensitive tokens in download URLs
* Use clear file names
* Record export errors safely

---

## Lesson 19.8: Dark Mode

### Learning goals

* Build theme switching without duplicating the interface
* Respect system preferences

### Features

* Light theme
* Dark theme
* System theme
* Persistent preference
* Accessible contrast
* Chart theme compatibility
* No visible theme flash during page load

---

# Module 20: Production Preparation and Deployment

## Lesson 20.1: Production Configuration

### Learning goals

* Separate development and production settings
* Protect secrets

### Environment variables

Backend:

* Database URL
* JWT signing secret
* Token expiration values
* Allowed frontend origins
* Application environment
* Logging level

Frontend:

* Public API base URL
* Application environment
* Public site URL

### Rules

* Never commit secrets
* Use separate development and production values
* Validate required settings at startup
* Rotate exposed secrets

---

## Lesson 20.2: CORS and Browser Security

### Learning goals

* Allow the frontend to call the backend safely
* Understand cross origin browser rules

### Topics

* Origin
* Allowed origins
* Allowed methods
* Allowed headers
* Credentials
* Preflight requests
* Wildcard risks

### Production plan

Allow only the actual frontend domain or domains that need API access.

---

## Lesson 20.3: Backend Health Checks

### Learning goals

* Create endpoints for deployment monitoring
* Distinguish application health from database health

### Health information

* Application running status
* Database connection status
* Application version
* Migration readiness

Avoid exposing secret configuration or detailed internal errors.

---

## Lesson 20.4: Production Server Processes

### Learning goals

* Understand how FastAPI runs outside the development server
* Understand frontend build output

### Topics

* Development server
* Production process
* Process binding
* Host and port
* Proxy headers
* Worker count
* Memory limits
* Graceful shutdown
* Static frontend output
* Node based frontend server, when required by the selected Qwik adapter

---

## Lesson 20.5: Container and Build Configuration

### Learning goals

* Define reproducible backend and frontend builds
* Prepare both applications for Dokku

### Backend build requirements

* Install Python dependencies
* Run the production application process
* Expose the expected web process
* Apply database migrations separately and safely

### Frontend build requirements

* Install Node dependencies
* Build the Qwik application
* Select the proper Qwik deployment adapter
* Start the production frontend process

### Completion checkpoint

Both projects can be built from clean checkouts.

---

## Lesson 20.6: Preparing the Linode VPS

### Learning goals

* Understand basic server administration
* Prepare a secure host for Dokku

### Topics

* VPS
* Public IP address
* SSH
* SSH keys
* Root account
* Administrative user
* Firewall
* Operating system updates
* DNS
* Backups

### Server preparation checklist

* Update system packages
* Configure SSH key access
* Disable unsafe authentication where appropriate
* Configure firewall
* Set server hostname
* Install Dokku
* Verify DNS access

---

## Lesson 20.7: Creating Dokku Applications

### Learning goals

* Create separate frontend and backend deployments
* Understand Git push deployment

### Dokku applications

* Health tracker API
* Health tracker frontend

### Configuration

* App names
* Git remotes
* Deployment branches
* Build method
* Environment variables
* Process types
* Domain assignments

Dokku supports Git based application deployment and can attach PostgreSQL services through its database plugin ecosystem.

---

## Lesson 20.8: Creating and Linking PostgreSQL

### Learning goals

* Run PostgreSQL through Dokku
* Link the database securely to the backend

### Tasks

* Install or verify the PostgreSQL plugin
* Create the database service
* Link it to the backend app
* Confirm the database URL
* Run migrations
* Verify connectivity
* Establish a backup process

### Completion checkpoint

The deployed FastAPI app can access the production database.

---

## Lesson 20.9: Domains and DNS

### Learning goals

* Connect public domains to each application
* Understand DNS propagation

### Suggested structure

* Frontend: `health.example.com`
* Backend: `api.health.example.com`

### DNS records

* Frontend record
* Backend record
* Server IP mapping
* Domain verification

---

## Lesson 20.10: HTTPS with Let’s Encrypt

### Learning goals

* Encrypt all browser traffic
* Configure automatic certificate renewal

### Requirements

* Valid domain names
* Correct DNS records
* Public server access
* Let’s Encrypt plugin
* Registration email
* Certificates for both applications

Dokku’s Let’s Encrypt integration requires the application domains to point correctly to the server before certificates can be issued.

---

## Lesson 20.11: Production Database Migrations

### Learning goals

* Apply schema updates without losing data
* Treat migrations as a deployment operation

### Deployment process

1. Back up the database
2. Review the migration
3. Deploy compatible application code
4. Run the migration
5. Verify migration status
6. Test critical routes
7. Watch logs
8. Prepare rollback steps

### Rules

* Never casually reset a production database
* Never edit a previously applied migration without understanding the consequences
* Keep migration files under version control
* Test migrations against realistic data

---

## Lesson 20.12: Production Validation

### Learning goals

* Verify the entire app after deployment
* Test security and core behavior in the real environment

### Production checklist

Authentication:

* Register
* Log in
* Refresh session
* Log out
* Reject invalid session

Food:

* Create
* Read
* Update
* Delete
* Calculate totals

Health records:

* Record weight
* Record mood
* Record sleep
* Edit each record
* Delete each record

Analytics:

* Load charts
* Change date ranges
* Verify totals
* Test empty ranges

Security:

* Confirm HTTPS
* Confirm CORS restrictions
* Confirm account isolation
* Confirm secrets are not exposed
* Confirm error messages are safe

Responsive interface:

* Desktop
* Tablet
* Mobile
* Touch interaction
* Keyboard interaction

---

# Module 21: Operations and Long Term Maintenance

## Lesson 21.1: Backups and Recovery

### Learning goals

* Protect user data
* Practice recovery before an emergency

### Backup plan

* Automated PostgreSQL backups
* Off server backup storage
* Retention schedule
* Encryption
* Restore testing
* Backup failure alerts

### Completion checkpoint

You can restore the application database into a separate test environment.

---

## Lesson 21.2: Monitoring and Logs

### Learning goals

* Detect failures after deployment
* Diagnose errors without exposing private data

### Monitor

* Application uptime
* API error rates
* Database availability
* Disk usage
* Memory usage
* Certificate expiration
* Failed deployments
* Backup completion

---

## Lesson 21.3: Dependency Maintenance

### Learning goals

* Keep the application secure and stable
* Avoid uncontrolled upgrades

### Process

1. Review outdated dependencies
2. Read release notes
3. Update in a branch
4. Run automated tests
5. Test migrations
6. Test locally
7. Deploy carefully
8. Watch production logs

---

## Lesson 21.4: Privacy and Account Management

### Learning goals

* Give users control over their information
* Plan responsible data handling

### Features to consider

* Change password
* Change email
* Download account data
* Delete health records
* Delete account
* Revoke all sessions
* Explain data retention
* Confirm destructive actions

---

# Final Capstone

## Capstone Goal

Deploy a complete health tracker that supports at least two users with fully isolated data.

## Required Capstone Features

### Authentication

* User registration
* Secure password hashing
* Login
* Access token handling
* Refresh or session strategy
* Logout
* Protected routes
* Per user data isolation

### Nutrition

* Food entry creation
* Food entry editing
* Food entry deletion
* Daily calorie total
* Daily macro totals
* Meal grouping

### Health tracking

* Weight logging
* Mood logging
* Sleep logging
* Latest value summaries

### History and analytics

* Date navigation
* Date range filtering
* Nutrition trends
* Weight trends
* Mood trends
* Sleep trends

### Personalization

* Daily nutrition goals
* Quick add templates
* Dark mode

### Data control

* CSV or JSON export
* Account data isolation
* Account logout

### Production

* FastAPI backend on Dokku
* Qwik frontend on Dokku
* PostgreSQL linked to backend
* Custom frontend and backend domains
* HTTPS
* Environment variables
* Health check
* Database backups

---

# Capstone Security Test

Create two test users:

* Test User A
* Test User B

Add food, weight, mood, and sleep records for both users.

Confirm that User A cannot:

* Fetch User B’s records
* Update User B’s records
* Delete User B’s records
* View User B’s summaries
* View User B’s analytics
* Export User B’s data

Repeat the tests from User B’s account.

The capstone is not complete until these tests pass.

---

# Recommended Learning Schedule

## Phase 1: Foundations

Modules 1 through 4

Focus:

* Product planning
* Development tools
* Python
* TypeScript
* HTTP
* API design

## Phase 2: Backend Fundamentals

Modules 5 through 8

Focus:

* FastAPI
* PostgreSQL
* SQLAlchemy
* Alembic

## Phase 3: Backend Features and Security

Modules 9 through 14

Focus:

* Authentication
* User isolation
* CRUD
* Summaries
* Analytics
* Testing

## Phase 4: Frontend Fundamentals

Modules 15 through 17

Focus:

* Qwik
* Qwik City
* Tailwind
* Authentication interface

## Phase 5: User Interface Features

Modules 18 and 19

Focus:

* Dashboard
* Forms
* History
* Charts
* Settings
* Templates
* Export

## Phase 6: Production

Modules 20 and 21

Focus:

* Linode
* Dokku
* PostgreSQL
* Domains
* HTTPS
* Backups
* Monitoring

---

# Recommended Lesson Routine

For each lesson:

1. Read the lesson objective.
2. Review the relevant official documentation.
3. Explain the concept in your own words.
4. Identify where the concept belongs in the health tracker.
5. Implement only the feature covered in that lesson.
6. Test the feature manually.
7. Add automated tests where applicable.
8. Record what worked and what failed.
9. Commit the completed lesson to Git.
10. Do not begin the next lesson until the current checkpoint works.

---

# Project Milestones

## Milestone 1: Backend Skeleton

* FastAPI runs
* Project structure exists
* Health endpoint works
* API documentation works

## Milestone 2: Database Foundation

* PostgreSQL connects
* SQLAlchemy models exist
* Initial Alembic migration works
* Database can be recreated from migrations

## Milestone 3: Authentication

* Registration works
* Login works
* Protected routes work
* Logout strategy works
* User isolation tests pass

## Milestone 4: Food Logging API

* Food CRUD works
* Date filtering works
* Daily totals work

## Milestone 5: Wellness API

* Weight works
* Mood works
* Sleep works
* Daily wellness summary works

## Milestone 6: Analytics API

* Date ranges work
* Nutrition trends work
* Weight trends work
* Mood and sleep trends work

## Milestone 7: Frontend Authentication

* Registration page works
* Login page works
* Protected layout works
* Logout works

## Milestone 8: Functional Dashboard

* Daily totals display
* Food entries display
* Food forms work
* Weight, mood, and sleep forms work
* Date navigation works

## Milestone 9: Complete User Experience

* History works
* Charts work
* Goals work
* Templates work
* Export works
* Dark mode works
* Mobile interface works

## Milestone 10: Production Release

* Backend deployed
* Frontend deployed
* PostgreSQL linked
* Migrations applied
* Domains configured
* HTTPS active
* Backups tested
* Two user isolation test completed

---

# Features Deliberately Deferred Until After Version One

These features should not be added until the main capstone works reliably:

* Barcode scanning
* External nutrition database integration
* Fitness device integration
* Apple Health integration
* Google Health Connect integration
* Meal photographs
* Artificial intelligence meal estimation
* Social sharing
* Coaching accounts
* Administrative dashboards
* Password reset emails
* Email verification
* Two factor authentication
* Native mobile applications
* Automated recommendations
* Medical interpretation

These can become separate advanced courses after the core application is complete.
