import { RouterProvider } from 'react-router-dom'
// import '@ant-design/v5-patch-for-react-19';
import router from './router'
const App = () => {
  return (
    <RouterProvider router={router} />
  )
}

export default App