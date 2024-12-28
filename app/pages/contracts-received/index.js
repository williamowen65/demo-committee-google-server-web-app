let roles;
document.addEventListener('DOMContentLoaded', async () => {
    roles = await CRUD.readAll('committee-roles')

    CRUD.readAll('ghost-contracts').then(contracts => {
        return contracts.filter(contract => contract.artistDetails.membershipPaid === true)
    }).then(renderContracts)
})

function renderContracts(contracts) {
    console.log("contracts", contracts)
    const contractsDiv = document.querySelector('#contracts')
    contractsDiv.innerHTML = ''
    contracts.forEach(contract => {
        const contractDiv = document.createElement('contract-received')

        const contractData = {
            firstName: contract?.artistDetails?.firstName || '',
            lastName: contract?.artistDetails?.lastName || '',
            membershipPaid: contract?.artistDetails?.membershipPaid || '',
            scholarshipApplied: contract?.artistDetails?.scholarshipApplied || '',
            studioSharingAnswer: contract?.StudioSharingAnswer || '',
            artisticDemonstration: contract?.artisticDemonstration || '',
            artistStatement: contract?.artistDetails?.artistStatement || '',
            artistTagline: contract?.artistDetails?.artistTagline || '',
            businessEmail: contract?.artistDetails?.businessEmail || '',
            facebook: contract?.artistDetails?.facebook || '',
            instagram: contract?.artistDetails?.instagram || '',
            mailingAddress: contract?.artistDetails?.mailingAddress || '',
            personalEmail: contract?.artistDetails?.personalEmail || '',
            phone: contract?.artistDetails?.phone || '',
            studioAddress: contract?.artistDetails?.studioAddress || '',
            website: contract?.artistDetails?.website || '',
            committeeRoles: contract?.committeeRoleId && renderCommitteeRoles(contract.committeeRoleId) || '',
            artistInStudioImage: contract?.images?.artistInStudioImage || '',
            brochureImage: contract?.images?.brochureImage || '',
            digitalImage1: contract?.images?.digitalImage1 || '',
            digitalImage2: contract?.images?.digitalImage2 || '',
            digitalImage3: contract?.images?.digitalImage3 || '',
            signature: contract?.signature || '',
            medium: contract?.artistDetails?.medium || ''
        }

        console.log({ contractData, contract })

        // set each attribute
        Object.keys(contractData).forEach(key => {
            contractDiv.setAttribute(key, contractData[key])
        })




        contractDiv.init()

        const div=document.createElement('div')
        div.classList.add('container')
        div.appendChild(contractDiv)

        div.appendChild(document.createElement('hr'))
        contractsDiv.appendChild(div)
    })
}

function renderCommitteeRoles(committeeRoleId) {


    return committeeRoleId.map(role => {

        const title = roles[role].title

        return `<li>${title}</li>`
    }).join('')
}