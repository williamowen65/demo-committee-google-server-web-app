
import '../../../utils/logIf.js'
import { enableTimelinePrivileges } from './timelinePriviledge.js';
import { sendTestEmail } from '../../outbound-emails/sendTestEmail.js';
import { processContractsToSheets } from '../../exports/google-sheets/processContractsToSheets.js';

const timeline = {}
const userRoles = {}
let configDocument;
let roles;

document.addEventListener('DOMContentLoaded', async function () {
 
  firebase.redirectIfNotLoggedIn('/artist-sign-on')
    .then(async (user) => {
      if (user) {
        roles = await CRUD.readAll('committee-roles')
        document.body.style.display = 'block'
        const userDiv = document.querySelector('#user')
        userDiv.style.display = 'block'
        userDiv.querySelector('#username').innerHTML = `Hello, ${user.displayName}`





        // Add timeline event from the database to the timeline
        await CRUD.readAll('ghost-timeline').then(ghostTimeline => {
          // remove the configDocument
          ghostTimeline = ghostTimeline.filter(event => {
            if (event.fbId !== 'configDocument') return event
            else {
              configDocument = event
            }
          })

          // set the year to the configDocument year
          document.getElementById('activeYear').innerText = configDocument.activeYear


          ghostTimeline = ghostTimeline.sort((a, b) => new Date(b.date) - new Date(a.date)).reverse()
          console.log({ timeline: ghostTimeline })
          const timelineContainer = document.getElementById('timeline')
          ghostTimeline.forEach(event => {
            const li = document.createElement('li')
            li.setAttribute('data-id', event.fbId)
            li.innerHTML = `
            <strong>${event.date}: </strong>
            ${event.description}
            `
            timelineContainer.querySelector('ul').appendChild(li)

            // Add the event to the timeline object
            timeline[event.fbId] = event
          })

        })

        // Get the GHOST contract for the user
        CRUD.read('ghost-contracts', user.uid).then(contract => {
          logIf.client && console.log(contract)
          // Get role name
          contract.committeeRoleId = contract.committeeRoleId || []

          // Also assigns userRoles object
          const sidePanel = getGhostSidePanel(contract.committeeRoleId)

          applyPrivileges(userRoles)

          document.querySelector('#user-role').innerHTML = `<h3>My Committee Role${contract.committeeRoleId.length > 1 ? 's' : ''}:</h3>${sidePanel.trim() ? sidePanel : 'No role assigned'}`
        })


        function applyPrivileges(userRoles) {
          Object.values(userRoles).forEach(role => {
            if (role.privileges && role.privileges.includes('editTimeline')) {

              enableTimelinePrivileges(configDocument, timeline)




            }

          })
        }


      

        /**
         * Side Panels are unique based on the role of the user
         * 
         * @param {Array int} roleId
         */
        function getGhostSidePanel(roleIds) {
          if (!roleIds) return ''
          return roleIds.map(roleId => {
            const role = roles[roleId]
            const roleTitle = role.title
            const roleButtons = role.sideBarButtons
            const responsibility = role.responsibility
            logIf.memberSidePanel && console.log("Rendering Member SidePanel for role", { role })
            userRoles[roleId] = role

            let sidePanelHTML = `<h4>${roleTitle}</h4><div>${responsibility}</div>`
            let buttons = document.createElement('div')
            buttons.setAttribute('style', 'display: flex; flex-direction: column;')


            if (roleButtons) {
              if (roleButtons.includes('newApplications')) {
                buttons.insertAdjacentHTML('beforeend', newApplicationsSidePanel(role))
              }
              if (roleButtons.includes('newScholarshipApplications')) {
                buttons.insertAdjacentHTML('beforeend', newScholarshipApplicationsButton(role))
              }
              if (roleButtons.includes('contracts-received')) {
                buttons.insertAdjacentHTML('beforeend', allContractsButton(role))
              }
              if (roleButtons.includes('testEmail')) {
                buttons.insertAdjacentHTML('beforeend', testEmailButton(role))
              }
              if (roleButtons.includes('testSheets')) {
                buttons.insertAdjacentHTML('beforeend', testSheetsButton(role))
              }
              if (roleButtons.includes('processToSheets')) {
                buttons.insertAdjacentHTML('beforeend', textProcessToSheetsButton(role))
              }
              if (roleButtons.includes('createDriveFolder')) {
                buttons.insertAdjacentHTML('beforeend', textCreateDriveFolderButton(role))
              }
              if (roleButtons.includes('createDocument')) {
                buttons.insertAdjacentHTML('beforeend', testCreateDocumentButton(role))
              }

            }

            sidePanelHTML += buttons.outerHTML

            return sidePanelHTML


          }).join("")
        }
      }
    })

  document.querySelector('#reset-password').addEventListener('click', () => {
    const email = firebase.auth.currentUser.email
    firebase.sendPasswordResetEmail(firebase.auth, email).then(() => {
      alert(`Password reset email sent to ${email}`)
    })
  })

  document.getElementById('logout').addEventListener('click', () => {
    firebase.signOut(firebase.auth).then(() => {
      window.location.href = '/artist-sign-on'
    })
  })
})

/*

Workflow for processing docs to pdf

Get folder name
create folder
for each contract: create a document, add content, add to folder
for each contract: convert to pdf, add to folder

*/

function processContractsToPdf() {
  const folderName = prompt("Enter a name for the folder", "GHOST Contracts")
  if (!folderName) return

  window.sendMessageToParent({
    controller: 'driveController',
    action: 'createFolder',
    folderName: folderName
  })

  window.addEventListener("message", (event) => {
    if (event.data.dispatch !== 'driveController-response') return
    if (event.data.error) {
      alert('Error creating folder')
      return
    }
    // You can add additional logic here to handle the message
    // show success message
    alert('Folder created successfully')
    // get all contracts
    CRUD.readAll('ghost-contracts').then(contracts => {
      logIf.client || true && console.log({ contracts })
      contracts.forEach(contract => {
        const docName = `${contract.artistDetails.firstName} ${contract.artistDetails.lastName} Contract`
        window.sendMessageToParent({
          controller: 'docsController',
          action: 'createDoc',
          docName: docName
        })

        window.addEventListener("message", (event) => {
          if (event.data.dispatch !== 'docsController-response') return
          if (event.data.error) {
            alert('Error creating document')
            return
          }
          // You can add additional logic here to handle the message
          // show success message
          alert('Document created successfully')

          // add content to the document
          const docId = event.data.data.docId
          const content = `
          <h1>Gig Harbor Open Studio Tour Contract</h1>
          <p>Contract for ${contract.artistDetails.firstName} ${contract.artistDetails.lastName}</p>
          <p>Medium: ${contract.artistDetails.medium}</p>
          <p>Artist Statement: ${contract.artistDetails.artistStatement}</p>
          <p>Website: ${contract.artistDetails.website}</p>
          <p>Facebook: ${contract.artistDetails.facebook}</p>
          <p>Instagram: ${contract.artistDetails.instagram}</p>
          <p>Phone: ${contract.artistDetails.phone}</p>
          <p>Personal Email: ${contract.artistDetails.personalEmail}</p>
          <p>Business Email: ${contract.artistDetails.businessEmail}</p>
          <p>Images: ${contract.images.digitalImage1}, ${contract.images.digitalImage2}, ${contract.images.digitalImage3}, ${contract.images.artistInStudioImage}</p>
        }
        `
          window.sendMessageToParent({
            controller: 'docsController',
            action: 'addContent',
            docId: docId,
            content: content
          })

          window.addEventListener("message", (event) => {
            if (event.data.dispatch !== 'docsController-response') return
            if (event.data.error) {
              alert('Error adding content to document')
              return
            }
            // You can add additional logic here to handle the message
            // show success message
            alert('Content added to document successfully')

            // add document to folder
            window.sendMessageToParent({
              controller: 'driveController',
              action: 'addDocToFolder',
              docId: docId,
              folderId: event.data.data.folderId
            })

            window.addEventListener("message", (event) => {
              if (event.data.dispatch !== 'driveController-response') return
              if (event.data.error) {
                alert('Error adding document to folder')
                return
              }
              // You can add additional logic here to handle the message
              // show success message
              alert('Document added to folder successfully')

              // convert document to pdf
              window.sendMessageToParent({
                controller: 'docsController',
                action: 'convertToPdf',
                docId: docId
              })

              window.addEventListener("message", (event) => {
                if (event.data.dispatch !== 'docsController-response') return
                if (event.data.error) {
                  alert('Error converting document to pdf')
                  return
                }
                // You can add additional logic here to handle the message
                // show success message
                alert('Document converted to pdf successfully')

                // add pdf to folder
                window.sendMessageToParent({
                  controller: 'driveController',
                  action: 'addPdfToFolder',
                  pdfId: event.data.data.pdfId,
                  folderId: event.data.data.folderId
                })

                window.addEventListener("message", (event) => {
                  if (event.data.dispatch !== 'driveController-response') return
                  if (event.data.error) {
                    alert('Error adding pdf to folder')
                    return
                  }
                  // You can add additional logic here to handle the message
                  // show success message
                  alert('Pdf added to folder successfully')

                })

              })

            })

          })

        })

      })
    })

  })

}




function newApplicationsSidePanel(role) {

  setTimeout(() => {
    // listen to new applications changes
    CRUD.listen('new-applications', null, (newApplications) => {
      logIf.client && console.log({ newApplications })
      const totalToReview = newApplications.filter(app => app.hasBeenReviewed === false).length
      const badge = document.querySelector('a.new-applications .badge')
      badge.innerText = totalToReview
      badge.setAttribute('data-count', totalToReview)
    })

  }, 1)

  return `
      <a onclick="navigateTo('/new-applications')" class="new-applications">
        <button style="position: relative;">New Artist Applications Received <span class="badge" data-count="0"></span></button>
    </a>`
}

function newScholarshipApplicationsButton(role) {
  setTimeout(() => {
    CRUD.listen('scholarship-applications', null, (newApplications) => {
      logIf.client && console.log({ newApplications })
      const totalToReview = newApplications.filter(app => app.hasBeenReviewed === false).length
      const badge = document.querySelector('a.scholarship-applications .badge')
      badge.innerText = totalToReview
      badge.setAttribute('data-count', totalToReview)
    })
  })
  return `
      <a onclick="navigateTo('/scholarship-applications')" class="scholarship-applications">
        <button  style="position: relative;">Scholarships Received <span class="badge" data-count="0"></span></button>
    </a>`
}

function allContractsButton(role) {

  setTimeout(() => {
    // listen to new applications changes
    CRUD.readAll('ghost-contracts').then(contracts => {
      logIf.client || true && console.log({ contracts })
      const totalToReview = contracts.filter(contract => contract.artistDetails.membershipPaid).length
      const badge = document.querySelector('a.contracts-received .badge')
      badge.innerText = totalToReview
      badge.setAttribute('data-count', totalToReview)
    })

  }, 1)

  return `
      <a onclick="navigateTo('/contracts-received')" class="contracts-received">
        <button style="position: relative;">Contracts Received <span class="badge" data-count="0"></span></button>
    </a>`
}




function testSheetsButton(role) {
  setTimeout(() => {

    document.getElementById('generateSheets').addEventListener('click', () => {

      // get some input from user (for testing purposes)
      const data = document.querySelector('textarea').value

      window.sendMessageToParent({
        controller: 'sheetsController',
        sheetName: 'testSheet',
        spreadsheetId: '1sAka-Rs4LhHhkX3J4s7SaDlpIXEdv5R5Qm7meGIL6Wk',
        action: 'upsert',
        key: 'rowId',
        data: JSON.parse(data)
      })

      window.addEventListener("message", (event) => {
        if (event.data.dispatch !== 'sheetsController-response') return
        if (event.data.error) {
          alert('Error generating sheets')
          return
        }
        console.log("sheetsController-response", event)
        // You can add additional logic here to handle the message
        // show success message
        alert('Sheets generated successfully: ' + event.data.sheetUrl)
      })
    })
  }, 1)

  return `<button id="generateSheets" style="position: relative;">Test Sheets </button>
  <textarea style="height:100px; width: 200px;">
{
  "rowId": 1,
  "name": "",
  "email": "",
  "newField": 
}
  </textarea>
  `
}

function textCreateDriveFolderButton(role) {
  setTimeout(() => {
    document.getElementById('createDriveFolder').addEventListener('click', () => {
      window.sendMessageToParent({
        controller: 'driveController',
        action: 'createFolder',
        folderName: 'Test Folder'
      })

      window.addEventListener("message", (event) => {
        if (event.data.dispatch !== 'driveController-response') return
        if (event.data.error) {
          alert('Error creating folder')
          return
        }
        // You can add additional logic here to handle the message
        // show success message
        alert('Folder created successfully')
      })
    })
  }, 1)

  return `<button id="createDriveFolder" style="position: relative;">Create Drive Folder </button>`
}

function testCreateDocumentButton(role) {
  setTimeout(() => {
    document.getElementById('createDocument').addEventListener('click', () => {
      window.sendMessageToParent({
        controller: 'docsController',
        action: 'createDoc',
        docName: 'Test Document'
      })

      window.addEventListener("message", (event) => {
        if (event.data.dispatch !== 'docsController-response') return
        if (event.data.error) {
          alert('Error creating document')
          return
        }
        // You can add additional logic here to handle the message
        // show success message
        alert('Document created successfully')
      })
    })
  }, 1)

  return `<button id="createDocument" style="position: relative;">Create Drive Document </button>`
}

function textProcessToSheetsButton(role) {
  setTimeout(() => {
    document.getElementById('processToSheets').addEventListener('click', async () => {

      // get the text of the button
      const buttonText = document.getElementById('processToSheets').innerText
      // show loading sign
      document.getElementById('processToSheets').innerText = 'Loading...'

      processContractsToSheets()

      window.addEventListener("message", (event) => {
        // return button text to normal
        document.getElementById('processToSheets').innerText = buttonText


        if (event.data.dispatch !== 'sheetsController-response') return
        if (event.data.error) {
          alert('Error generating sheets')
          return
        }


        const data = event.data.data
        const sheetUrl = data.sheetUrl
        console.log("sheetsController-response", event)
        // You can add additional logic here to handle the message
        // show success message
        // alert('Sheets generated successfully: ' + data.sheetUrl)
        window.openUrl(sheetUrl)
      })
    })
  }, 1)

  return `<button id="processToSheets" style="position: relative;">Google Sheet Summary</button>
  `
}

function testEmailButton(role) {
  setTimeout(() => {
    document.getElementById('sendEmail').addEventListener('click', () => {

      sendTestEmail()


      window.addEventListener("message", (event) => {
        if (event.data.dispatch !== 'gmailController-response') return

        if (event.data.error) {
          alert('Error sending email')
          return
        }

        // You can add additional logic here to handle the message
        // show success message
        alert('Email is sent.')
        // redirect to the dashboard
      });



    }, 1)
  })
  return `        <button id="sendEmail" style="position: relative;">Test Email </button>`
}