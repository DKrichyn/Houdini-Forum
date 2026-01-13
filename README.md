# Houdini
## Short description
    Houdini is a project that implemented the task of creating a forum website, which completely contains all the standard functionality for this purpose. The site is designed in green tones with some visual identity. In short, here people can exchange their thoughts and ideas on this matter, simple communication in a meaningful form.

## Website screenshots
### Sing in page
![API request example](1.png)
### Sing up page  
![API request example](2.png) 
### Home page
![API request example](3.png) 
### User page 
![API request example](4.png)  
### Post page
![API request example](5.png)  
### Create post page
![API request example](6.png)   

## Requirements and dependencies
    
    The project contains a packege.json file that lists all dependencies, so there won't be any problems installing them, but I'll list them here.
    ### Requirements and Dependencies

### System Requirements
- **Node.js** ≥ 20 .x  
- **npm** ≥ 9 .x or **yarn** ≥ 1.22 .x  
- **MySQL** ≥ 8 .x  
- Recommended OS: macOS / Linux / Windows 10+

###  Backend Dependencies
| Package | Purpose |
|----------|----------|
| **express** | Core web server framework |
| **cors** | Enables Cross-Origin Resource Sharing |
| **dotenv** | Environment variable management |
| **helmet** | HTTP security headers |
| **express-rate-limit** | Request-rate limiter for abuse prevention |
| **joi** | Schema validation for requests |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | Token-based authentication (JWT) |
| **multer** | Handling file uploads (multipart/form-data) |
| **mysql2** | MySQL driver & connection pooling |
| **nodemailer** | Sending transactional emails |
| **slugify** | Generating URL-friendly slugs |
| **morgan** | HTTP request logger for development |
| **swagger-ui-express** | Interactive API documentation |
| **js-yaml** | Parsing YAML for Swagger configs |

###  Frontend Dependencies
| Package | Purpose |
|----------|----------|
| **react** / **react-dom** | Core React library & DOM renderer |
| **react-redux** + **redux** + **redux-thunk** | State management and async actions |
| **react-router-dom** | Routing between pages |
| **react-scripts** | Build / run configuration (Create React App) |

## How to run

    To server
- Copy the repository using `git clone` 
- Use cd usof-backend 

        Create a `.env` file in the root directory:
- npm install 
- npm reseed
- npm run dev

    After this
- Use cd ../usof-frontend
- Use cd usof-backend 
- npm install 
- npm run dev

        After this use URL that frontend used and do anything you think you need to test the program's operation, the user-friendly interface will help you with this.

